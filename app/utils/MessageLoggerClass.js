class MessageLoggerClass {
    messages = [];

    constructor() {
    }

    logMessage(message) {
        this.messages.push(message);
    }

    getMessages() {
        return this.messages;
    }

    clearMessages() {
        this.messages = [];
    }

    consoleLog(){
        this.messages.forEach(message => console.log(message));
    }
}

module.exports = MessageLoggerClass