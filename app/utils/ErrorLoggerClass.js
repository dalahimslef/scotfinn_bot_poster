class ErrorLoggerClass {
    errors = [];

    constructor() {
    }

    logError(message) {
        this.errors.push(message.substr(0,300).trim());
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = [];
    }

    consoleLog(){
        this.errors.forEach(error => console.log(error));
    }
}

module.exports = ErrorLoggerClass