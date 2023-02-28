class AsyncExec {
    scanCompleted = false;
    completedResolve = function () { }

    dirScanFinishedCallback() {
        this.scanCompleted = true;
        this.completedResolve();
    }

    async awaitCompletion() {
        if (!this.scanCompleted) {
            await new Promise((resolve) => {
                this.completedResolve = resolve;
            });
        }
        else {
            console.log('no waiting required');
        }
    }
}

module.exports = AsyncExec