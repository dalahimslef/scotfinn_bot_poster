const axios = require('axios');
const config = require("../config/config.js");
const botconfig = require("../config/bot_config.js");

const baseUrl = config.api_server_baseurl;

/*
const authHeader = () => {
    return {};
}

axios.interceptors.request.use(function (config) {
    config.headers = authHeader();
    return config;
}, function (error) {
    // Do something with request error
    return Promise.reject(error);
});

axios.interceptors.response.use(function (response) {
    if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response;
}, function (error) {
    return Promise.reject(error);
});
*/



const getAxiosResponse = async (config) => {
    if (!config.params) {
        config.params = {};
    }
    config.params['_bot_key'] = botconfig.bot_key;
    let response = {
        data: {},
        status: -1,
        statusText: '',
        headers: {},
        config: {},
        request: {}
    }
    try {
        response = await axios(config);
    } catch (error) {
        if (error.response) {
            const message = error.response.status + ' ' + error.response.statusText + ': ' + error.response.data;
            console.log(message);
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            response = error.response;
            if (response.status === 401) {
                //redirect to login if not authorized
                //logout();
            }
            response._error = {
                type: 'got_response',
                message
            }
        } else if (error.request) {
            console.log(error.message);
            //response._no_response = true;
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            response._error = {
                type: 'no_response',
                message: error.message
            }
        } else {
            console.log(error.message);
            //response._error_before_send = true;
            // Something happened in setting up the request that triggered an Error
            response._error = {
                type: 'error_before_send',
                message: error.message
            }
        }
    }

    return response;
}

const register = async (name, user_name, email, password) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/register',
        data: {
            name, user_name, email, password
        }
    }
    const response = await getAxiosResponse(config);

    if (response.data.token) {
        //localStorage.setItem('user', JSON.stringify(response.data));
    }

    return response;
}

const updateProfile = async (name, user_name, email, password, image) => {

    let formData = new FormData();
    // NOTE:
    // The name of the parameter has to match the name parameter used by the Multer moduleon the server.
    // The server is configured for single file uploads with the name of the file being 'profile_image'
    formData.append('name', name);
    formData.append('user_name', user_name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('profile_image', image);
    const config = {
        method: 'put',
        baseURL: baseUrl,
        url: '/api/user/update',
        data: formData,
        //data: { name, user_name, email, password, profile_image },
    }
    const response = await getAxiosResponse(config);

    if (response.data.token) {
        //localStorage.setItem('user', JSON.stringify(response.data));
    }

    return response;

}

const updateChannel = async (channelId, name, avatarImage, logoImage) => {

    let formData = new FormData();
    // NOTE:
    // The name of the parameter has to match the name parameter used by the Multer moduleon the server.
    // The server is configured for single file uploads with the name of the file being 'logo_image'
    formData.append('channelId', channelId);
    formData.append('name', name);
    if (avatarImage) {
        formData.append('channel_image_files', avatarImage);
        formData.append('filetype', 'avatar');
    }
    if (logoImage) {
        formData.append('channel_image_files', logoImage);
        formData.append('filetype', 'logo');
    }
    const config = {
        method: 'put',
        baseURL: baseUrl,
        url: '/api/channel/update',
        data: formData,
        //data: { name, user_name, email, password, profile_image },
    }
    const response = await getAxiosResponse(config);
    return response;

}

const login = async (email, password) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/login',
        data: {
            email, password
        }
    }
    const response = await getAxiosResponse(config);

    if (response.data.token) {
        //localStorage.setItem('user', JSON.stringify(response.data));
    }

    return response;
}

const logout = () => {
    //localStorage.removeItem('user');
}

const getStories = async (params) => {
    const config = {
        method: 'get',
        url: baseUrl + '/api/story',
        params,
    }
    const response = await getAxiosResponse(config);

    let stories = [];
    if (response.data) {
        stories = response.data;
    }

    return stories;
}

const postStory = async (url, header, ingress, image_url, news_value, channel, category, tags, story_type, alternative_to, alternative_to_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/story',
        data: {
            url, header, ingress, image_url, news_value, channel, category, tags, story_type, alternative_to, alternative_to_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const updateStory = async (storyId, url, header, ingress, image_url, news_value, channel, category, tags) => {
    const config = {
        method: 'put',
        baseURL: baseUrl,
        url: '/api/story/' + storyId,
        data: {
            url, header, ingress, image_url, news_value, channel, category, tags
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const deleteStory = async (storyId) => {
    const config = {
        method: 'delete',
        baseURL: baseUrl,
        url: '/api/story/' + storyId,
        data: {
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getUserChannels = async (username) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/user/' + username + '/channels',
    }
    const response = await getAxiosResponse(config);

    let channels = {};
    if (response.data) {
        channels = response.data;
    }

    return channels;
}

const getUserCategoryIds = async (username) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/user/' + username + '/categories',
    }
    const response = await getAxiosResponse(config);

    let categories = {};
    if (response.data) {
        categories = response.data;
    }

    return categories;
}

const getDefaultCategoryIds = async () => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/default_category',
    }
    const response = await getAxiosResponse(config);

    let categories = {};
    if (response.data) {
        categories = response.data;
    }

    return categories;
}

const addDefaultCategory = async () => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/default_category',
    }
    const response = await getAxiosResponse(config);

    let categories = {};
    if (response.data) {
        categories = response.data;
    }

    return categories;
}

const getUserFavouriteTags = async (username) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/user/' + username + '/tags',
    }
    const response = await getAxiosResponse(config);

    let tags = [];
    if (response.data) {
        response.data.forEach(userTag => { tags.push(userTag.tag_id); });
    }
    return tags;
}

const getUsers = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/user',
        params,
    }
    const response = await getAxiosResponse(config);

    let users = [];
    if (response.data.found_users) {
        response.data.found_users.forEach(user => { users.push(user); });
    }
    return users;
}

const createChannel = async (channelName) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel',
        data: {
            channelName
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getCategories = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/category',
        params
    }
    const response = await getAxiosResponse(config);

    return response;
}

const createCategory = async (name, parent_category) => {
    const data = { name };

    if (parent_category !== 'no_parent') {
        data.parent_category = parent_category;
    }

    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/category',
        data: data,
    }
    const response = await getAxiosResponse(config);

    return response;
}

const deleteCategory = async (category_id) => {
    const data = { category_id };

    const config = {
        method: 'delete',
        baseURL: baseUrl,
        url: '/api/category',
        data: data,
    }
    const response = await getAxiosResponse(config);

    return response;
}

const deleteProperties = async (property_urls, site_name) => {
    const data = { property_urls, site_name };

    const config = {
        method: 'delete',
        baseURL: baseUrl,
        url: '/api/properties',
        data: data,
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getUrlsFromTags = async (tag_ids, page) => {
    // returns max 100 urls per 'page'
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/story_url_tag',
        params: { tag_ids, page },
    }
    const response = await getAxiosResponse(config);

    const storyUrls = [];
    if (response.data) {
        response.data.forEach(urlInfo => { storyUrls.push(urlInfo.url_id); })
    }

    return storyUrls;
}

const getStoryUrls = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/story_url',
        params,
    }
    const response = await getAxiosResponse(config);

    const storyUrls = [];
    if (response.data) {
        response.data.forEach(urlInfo => { storyUrls.push(urlInfo); })
    }

    return storyUrls;
}

const getChannels = async (filter, sort_by, page) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/channel',
        params: { filter, sort_by, page },
    }
    const response = await getAxiosResponse(config);

    return response;
}

const subscribeChannel = async (username, channel_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/' + username + '/channels',
        data: { channel_id },
    }
    const response = await getAxiosResponse(config);

    return response;
}

const subscribeCategory = async (username, category_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/' + username + '/categories',
        data: { category_id },
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getTags = async () => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/tag',
    }
    const response = await getAxiosResponse(config);

    return response;
}

const subscribeTag = async (username, tag_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/' + username + '/tags',
        data: { tag_id },
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getUrlReadCount = async (tags, timespan, sort_by, page) => {
    // if tags is empty array we find readcount for all tags
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/story_url/read_count',
        params: { tags, timespan, sort_by, page },
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getComments = async (comment_id, poster_id, url_id, parent_comment_id, page) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/comment',
        params: { comment_id, poster_id, url_id, parent_comment_id, page },
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const postComment = async (story_id, url_id, parent_comment_id, anonymous, comment) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/comment',
        data: { story_id, url_id, parent_comment_id, anonymous, comment },
    }
    const response = await getAxiosResponse(config);

    let reply = { success: false, message: 'Error posting comment' };
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getTagsFromStory = async (story_id) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/story/' + story_id + '/tags',
        params: {},
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getChannelMembers = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/channel_member',
        params,
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const addChannelMember = async (channelId, addUserId) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_member',
        data: { channelId, addUserId },
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getPrivilageDefinitions = async () => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/user/defined_privilages',
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getStoryTags = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/story_tag',
        params,
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getNotifications = async (user_id) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/notification',
        params: { user_id },
    }
    const response = await getAxiosResponse(config);
    let reply = [];
    if (response.data) {
        reply = response.data;
    }

    return reply;
}

const getLikes = async (story_ids) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/like',
        params: {
            story_ids
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const postLike = async (story_id, type) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/like',
        data: {
            story_id, type
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const requestChannelMembership = async (channel_id, requester_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_membership_request/request',
        data: {
            channel_id, requester_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const acceptChannelMembershipRequest = async (request_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_membership_request/accept',
        data: {
            request_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const rejectChannelMembershipRequest = async (request_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_membership_request/reject',
        data: {
            request_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const inviteChannelMembership = async (channel_id, invited_user_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_membership_invitation/invite',
        data: {
            channel_id, invited_user_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const acceptChannelMembershipInvitation = async (invite_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_membership_invitation/accept',
        data: {
            invite_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const rejectChannelMembershipInvitation = async (invite_id) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/channel_membership_invitation/reject',
        data: {
            invite_id
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getChannelMembershipRequests = async (params) => {
    const config = {
        method: 'get',
        url: baseUrl + '/api/channel_membership_request',
        params,
    }
    const response = await getAxiosResponse(config);

    let requests = [];
    if (response.data) {
        requests = response.data;
    }
    return requests;
}

const getChannelMembershipInvites = async (params) => {
    const config = {
        method: 'get',
        url: baseUrl + '/api/channel_membership_invitation',
        params,
    }
    const response = await getAxiosResponse(config);

    let invites = [];
    if (response.data) {
        invites = response.data;
    }
    return invites;
}

const requestPasswordResetLink = async (email) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/request_password_reset_link',
        data: {
            email
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const resetPassword = async (session_id, password) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/user/reset_password',
        data: {
            session_id, password
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const addBotUser = async (name, channelName, postsInCategories) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/bot_users',
        data: {
            name, channelName, postsInCategories
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getBotUsers = async () => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/bot_users',
    }
    const response = await getAxiosResponse(config);

    let botUsers = [];
    if (response.data.botUsers) {
        botUsers = response.data.botUsers;
    }
    return botUsers;
}

const updateBotUser = async (userBotId, name, channelName, postsInCategories) => {
    const config = {
        method: 'put',
        baseURL: baseUrl,
        url: '/api/bot_users',
        data: {
            userBotId, name, channelName, postsInCategories
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getBotPosts = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/bot_post',
        params,
    }
    const response = await getAxiosResponse(config);

    let botPosts = [];
    if (response.data.botPosts) {
        botPosts = response.data.botPosts;
    }

    return botPosts;
}

const postBotProperties = async (properties, scrapeStart, scrapeEnd) => {
    // invalidUrls are included as well and is saved in the database so that they are counted as 
    // allready posted when we call getBotPostedUrls. (See getBotPostedUrls)
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/bot_post',
        data: {
            properties, scrapeStart, scrapeEnd
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const postBotMessages = async (messages) => {
    // messages is an array of {message, type}
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/bot_message',
        data: {
            messages
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const deleteBotMessages = async () => {
    const config = {
        method: 'delete',
        baseURL: baseUrl,
        url: '/api/bot_message',
        data: {
        }
    }
    const response = await getAxiosResponse(config);

    return response;
}

const getBotPostedUrls = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/bot_posted_url',
        params,
    }
    const response = await getAxiosResponse(config);

    let postedUrls = [];
    if (response.data.postedUrls) {
        postedUrls = response.data.postedUrls;
    }
    if (response.data.invalidUrls) {
        postedUrls = postedUrls.concat(response.data.invalidUrls);
    }

    return postedUrls;
}

const getSitePropertyUrls = async (siteName) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/properties/site',
        params: {
            siteName
        }
    }
    const response = await getAxiosResponse(config);

    let postedUrls = [];
    if (response.data) {
        postedUrls = response.data;
    }

    return postedUrls;
}

const getPropertySites = async () => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/property_site',
        params: {
        }
    }
    const response = await getAxiosResponse(config);

    let sites = [];
    if (response.data) {
        sites = response.data;
    }

    return sites;
}

const getBotStatus = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/bot_status',
        params,
    }
    const response = await getAxiosResponse(config);

    let botStatus = {};
    if (response.data) {
        botStatus = response.data;
    }

    return botStatus;
}

const botStart = async (params) => {
    const config = {
        method: 'get',
        baseURL: baseUrl,
        url: '/api/bot_starter_semaphore',
        params,
    }
    const response = await getAxiosResponse(config);

    let started = false;
    if (response.data && response.data.set_as_started) {
        started = true;
    }

    return started;
}

const saveBotStatus = async (botStatus) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/bot_status',
        params: { botStatus },
    }
    const response = await getAxiosResponse(config);

    let postedUrls = [];
    if (response.data.postedUrls) {
        postedUrls = response.data.postedUrls;
    }
    if (response.data.invalidUrls) {
        postedUrls = postedUrls.concat(response.data.invalidUrls);
    }

    return postedUrls;
}

const setBotIdle = async (params) => {
    const config = {
        method: 'post',
        baseURL: baseUrl,
        url: '/api/bot_starter_semaphore',
        params,
    }
    const response = await getAxiosResponse(config);

    let postedUrls = [];
    if (response.data.postedUrls) {
        postedUrls = response.data.postedUrls;
    }
    if (response.data.invalidUrls) {
        postedUrls = postedUrls.concat(response.data.invalidUrls);
    }

    return postedUrls;
}


/*exports.register,
exports.updateProfile,
exports.updateChannel,
exports.login,
exports.logout,
exports.getStories,
exports.postStory,
exports.updateStory,
exports.deleteStory,
exports.getUserChannels,
exports.createChannel,
exports.createCategory,
exports.deleteCategory,
exports.getUserCategoryIds,
exports.getDefaultCategoryIds,
exports.addDefaultCategory,
exports.getUserFavouriteTags,
exports.getUrlsFromTags,
exports.getStoryUrls,
exports.getChannels,
exports.subscribeChannel,
exports.subscribeCategory,
exports.getTags,
exports.subscribeTag,
exports.getUrlReadCount,
exports.getComments,
exports.postComment,
exports.getTagsFromStory,
    exports.getUsers,
    exports.getChannelMembers,
    exports.addChannelMember,
    exports.getPrivilageDefinitions,
    exports.getStoryTags,
    exports.getNotifications,
    exports.getLikes,
    exports.postLike,
    exports.getChannelMembershipRequests,
    exports.requestChannelMembership,
    exports.acceptChannelMembershipRequest,
    exports.rejectChannelMembershipRequest,
    exports.getChannelMembershipInvites,
    exports.inviteChannelMembership,
    exports.acceptChannelMembershipInvitation,
    exports.rejectChannelMembershipInvitation,
    exports.requestPasswordResetLink,
    exports.resetPassword,
    exports.addBotUser
    
    exports.updateBotUser*/

exports.getCategories = getCategories;
exports.getBotUsers = getBotUsers;
exports.postBotProperties = postBotProperties;
exports.getBotPosts = getBotPosts;
exports.getBotPostedUrls = getBotPostedUrls;
exports.getBotStatus = getBotStatus;
exports.botStart = botStart;
exports.saveBotStatus = saveBotStatus;
exports.setBotIdle = setBotIdle;
exports.getSitePropertyUrls = getSitePropertyUrls;
exports.deleteProperties = deleteProperties;
exports.postBotMessages = postBotMessages;
exports.deleteBotMessages = deleteBotMessages;
exports.getPropertySites = getPropertySites;

