class AsyncExec {
    klassename= 'testinggg';
    scanCompeted = false;
    completedResolve = function() { }

    dirScanFinishedCallback() {
        this.scanCompeted = true;
        console.log('in dirScanFinishedCallback');
        console.log(this.klassename);
        console.log(typeof this.completedResolve);
        this.completedResolve();
    }

    async awaitCompletion() {
        if (!this.scanCompeted) {
            await new Promise((resolve) => {
                console.log('waiting...');
                console.log(this.klassename);
                console.log(typeof this.completedResolve);
                this.completedResolve = resolve;
                console.log(typeof this.completedResolve);
                console.log('resolve set...');
            });
        }
        else {
            console.log('no waiting required');
        }
    }
}

module.exports = AsyncExec