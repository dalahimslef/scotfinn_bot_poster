const fs = require('fs');
exports.saveObjectToFile = (obj, filename) => {
    // json data
    var jsonData = '{"persons":[{"name":"John","city":"New York"},{"name":"Phil","city":"Ohio"}]}';

    // parse json
    var jsonObj = JSON.parse(jsonData);
    console.log(jsonObj);

    // stringify JSON Object
    var jsonContent = JSON.stringify(jsonObj);
    console.log(jsonContent);

    fs.writeFile(filename, jsonContent, 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }

        console.log("JSON file has been saved.");
    });
}