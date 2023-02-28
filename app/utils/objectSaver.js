const fs = require('fs');
exports.saveObjectToFile = (obj, filename) => {
    var jsonObj = obj;

    var jsonContent = JSON.stringify(jsonObj);

    fs.writeFile(filename, jsonContent, 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }

        console.log("JSON file has been saved.");
    });
}