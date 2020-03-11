enum PromiseStateEnum {
  Pending = 'Pending',
  Resolved = 'Resolved',
  Rejected = 'Rejected'
}

type Resolver<Type> = (value?: Type) => void;
type Rejector = (reason?: any) => void;
type ResolveHandler<Type> = (value: Type) => Type | MyPromise<Type> | void;
type RejectHandler = (reason: any) => any;
type Executor<Type> = (resolve?: Resolver<Type>, reject?: Rejector) => void;
interface QueueItem<Type> {
  handler: ResolveHandler<Type> | RejectHandler,
  promise: MyPromise<Type>
}

class MyPromise<Type> {
  private resolutionQueue: QueueItem<Type>[];
  private rejectionQueue: QueueItem<Type>[];
  private state: PromiseStateEnum;
  private rejectionReason: any;
  private value: Type;

  public constructor(executor: Executor<Type>) {
    this.state = PromiseStateEnum.Pending;
    this.resolutionQueue = [];
    this.rejectionQueue = [];

    try {
      executor(
        this.resolve.bind(this),
        this.reject.bind(this)
      );
    } catch (error) {
      this.reject(error);
    }
  }

  public then(resolutionHandler?: ResolveHandler<Type>): MyPromise<Type> {
    const newPromise = new MyPromise<Type>(() => {});

    this.resolutionQueue.push({
      handler: resolutionHandler,
      promise: newPromise
    });

    if (this.state === PromiseStateEnum.Resolved) {
      this.runResolutionHandlers();
    } else if (this.state === PromiseStateEnum.Rejected) {
      newPromise.reject(this.rejectionReason);
    }

    return newPromise;
  }

  public catch(rejectionHandler: RejectHandler): MyPromise<Type> {
    const newPromise = new MyPromise<Type>(() => {});

    this.rejectionQueue.push({
      handler: rejectionHandler,
      promise: newPromise
    });

    if (this.state === PromiseStateEnum.Rejected) {
      this.runRejectionHandlers();
    }

    return newPromise;
  }

  private runResolutionHandlers(): void {
    this.runHandlers(this.resolutionQueue, this.value);
  }

  private runRejectionHandlers(): void {
    this.runHandlers(this.rejectionQueue, this.rejectionReason);
  }

  private runHandlers(queue: QueueItem<Type>[], value: any): void {
    while(queue.length > 0) {
      const queueItem = queue.shift();
      let returnValue: any;

      try {
        returnValue = queueItem.handler(value);
      } catch(error) {
        queueItem.promise.reject(error);
      }

      if (returnValue && returnValue instanceof MyPromise) {
        returnValue
          .then((value) => queueItem.promise.resolve(value))
          .catch((error) => queueItem.promise.reject(error));
      } else {
        queueItem.promise.resolve(returnValue);
      }
    }
  }

  private resolve(value?: Type): void {
    this.value = value;
    this.state = PromiseStateEnum.Resolved;
  }

  private reject(reason?: any): void {
    this.rejectionReason = reason;
    this.state = PromiseStateEnum.Rejected;
  }
}

const hello = new MyPromise<string>((resolve, reject) => {
  resolve('success0');
});


hello
  .then((value) => {
    console.log(value);
    return new MyPromise<string>((resolve, reject) => {
      resolve('success1');
    });
  })
  .then((value) => {
    console.log(value);
    return new MyPromise<string>((resolve, reject) => {
      resolve('success2');
    });
  })
  .then((value) => {
    console.log(value);
    return new MyPromise<string>((resolve, reject) => {
      if (Math.random() > 0.5) {
        resolve('success3');
      } else {
        reject('failure');
      }
    });
  })
  .then((value) => {
    console.log(value);
  })
  .catch((reason) => {
    console.log(reason);
  });
