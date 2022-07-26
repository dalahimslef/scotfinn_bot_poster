const api = require('../api/api.js');

const getRequiredCategoriesToLoad = async (categoryIds) => {
    const categoryReply = await api.getCategories({ filtertype: "categoryIds_filter", categoryIds });
    const categoriesToLoad = {};
    if (categoryReply.data.found_categories) {
        categoryReply.data.found_categories.forEach((categoryInfo) => {
            categoriesToLoad[categoryInfo._id] = categoryInfo;
            categoryInfo.parent_categories.forEach(parentCategoryId => {
                if (!categoriesToLoad[parentCategoryId]) {
                    categoriesToLoad[parentCategoryId] = {};
                }
            })
        });
    }
    let parentCategories = {};
    const parentCategoriesToLoad = []
    Object.keys(categoriesToLoad).forEach(categoryId => {
        if (!categoriesToLoad[categoryId].name) {
            parentCategoriesToLoad.push(categoryId);
        }
    });
    if (parentCategoriesToLoad.length !== 0) {
        parentCategories = await getRequiredCategoriesToLoad(parentCategoriesToLoad);
        Object.keys(parentCategories).forEach(categoryId => {
            categoriesToLoad[categoryId] = parentCategories[categoryId];
        });
    }
    return categoriesToLoad;
}

const getCategoryPath = (inputCategories) => {
    const allCategories = inputCategories;
    let allPathsSet = {};
    let allSet = false;
    while (!allSet) {
        Object.keys(allCategories).forEach(categoryId => {
            if (!allPathsSet[categoryId]) {
                if (!allCategories[categoryId].paths) {
                    allCategories[categoryId].paths = [];
                }
                if (allCategories[categoryId].parent_categories.length == 0) {
                    allCategories[categoryId].paths.push('/');
                    allPathsSet[categoryId] = true;
                }
                else {
                    let allParentsSet = true;
                    allCategories[categoryId].parent_categories.forEach(parentCategoryId => {
                        if (!allPathsSet[parentCategoryId]) {
                            allParentsSet = false;
                        }
                    });
                    if (allParentsSet) {
                        allCategories[categoryId].parent_categories.forEach(parentCategoryId => {
                            allCategories[parentCategoryId].paths.forEach(parentPath => {
                                allCategories[categoryId].paths.push(parentPath + '/' + allCategories[parentCategoryId].name);
                            });
                        });
                        allPathsSet[categoryId] = true;
                    }
                }
            }
        });
        allSet = true;
        Object.keys(allCategories).forEach(categoryId => {
            if (!allPathsSet[categoryId]) {
                allSet = false;
            }
        });
    }

    return allCategories;
}

const getCategoriesInfo = async (categoryIds, returnOnlySpecifiedCategories) => {
    const allCategories = await getRequiredCategoriesToLoad(categoryIds);
    const allCategoryInfo = getCategoryPath(allCategories);

    let categoryInfo;
    // allCategoryInfo includes info about subcategories as well
    if (returnOnlySpecifiedCategories) {
        categoryInfo = {};
        categoryIds.forEach(categoryId => {
            if (allCategoryInfo[categoryId]) {
                categoryInfo[categoryId] = allCategoryInfo[categoryId];
            }
        })
    }
    else {
        categoryInfo = allCategoryInfo;
    }

    return categoryInfo;
}

const getCategoryTree = async (categoryIds) => {
    const categories = await getCategoriesInfo(categoryIds);
    Object.keys(categories).forEach(catId => {
        categories[catId].child_categories = {};
        categories[catId].childCount = 0;
    });
    Object.keys(categories).forEach(catId => {
        categories[catId].parent_categories.forEach(parentCategoryId => {
            categories[parentCategoryId].child_categories[catId] = categories[catId];
            categories[parentCategoryId].childCount += 1;
        });
    });
    Object.keys(categories).forEach(catId => {
        if (categories[catId].parent_categories.length != 0) {
            delete (categories[catId]);
        }
    });
    return categories;
}

exports.getCatergoryPaths = async () => {
    const paths = {};
    const categoriesInfo = await getCategoriesInfo(await getAllCategoryIds());
    Object.keys(categoriesInfo).forEach(categoryId => {
        categoriesInfo[categoryId].paths.forEach(path => {
            const fullPath = path + '/' + categoriesInfo[categoryId].name;
            paths[fullPath.toLowerCase()] = categoryId;
        })
    })
    return paths;
}

const getAllCategories = async () => {
    let allCategories = [];
    const reply = await api.getCategories({});
    if (reply.status == 200 && reply.data && reply.data.found_categories) {
        allCategories = reply.data.found_categories;
    }
    return allCategories;
}

const getAllCategoryIds = async () => {
    const categoryIds = [];
    const categories = await getAllCategories();
    categories.forEach(cat => { categoryIds.push(cat._id) });
    return categoryIds;
}

const getCategoryTreeArray = (categoryTree) => {
    const categoryTreeArray = [];
    Object.keys(categoryTree).forEach(id => {
        categoryTree[id].childArray = getCategoryTreeArray(categoryTree[id].child_categories);
        categoryTreeArray.push(categoryTree[id]);
    });

    categoryTreeArray.sort(function compareFn(a, b) {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
        }
        if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
        }
        return 0;
    });
    return categoryTreeArray;
}

const getItemFormattedArray = (categoryTreeArray, level) => {
    let itemFormattedArray = [];
    categoryTreeArray.forEach(category => {
        let value = category._id;
        const indent = level * 30;
        let text = category.name;
        let indentedText = '<span style="padding-left:' + indent + 'px;">' + category.name + '</span>';
        itemFormattedArray.push({ value, text, indentedText });
        itemFormattedArray = itemFormattedArray.concat(getItemFormattedArray(category.childArray, level + 1));
    });
    return itemFormattedArray;
}

const getSelectItemsFormattedCategories = async (categoryIds) => {
    const categoryTree = await getCategoryTree(categoryIds);
    const categoryTreeArray = getCategoryTreeArray(categoryTree);
    const itemFormattedArray = getItemFormattedArray(categoryTreeArray, 0);
    return itemFormattedArray;
}

/*
exports = {
    getCategoriesInfo,
    getCategoryTree,
    getAllCategories,
    getAllCategoryIds,
    getSelectItemsFormattedCategories,
};
*/