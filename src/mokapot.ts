/**
 * Async generator for setting up and tearing down a resource.
 */
export type ResourceGenerator<A> = AsyncGenerator<A, void, void>;

/**
 * Gets the current value of a resource.
 *
 * @throws Error if called outside a test
 */
export type Current<A> = () => A;

/**
 * NodeJS error-first callback.
 */
export type NodeCB<A> = (e: Error | undefined | null, a: A) => void;

export class Resource<A> {
  /**
   * Creates a Resource from an async generator.
   *
   * @param genA generates an A (should yield exactly once)
   */
  static gen = function <A>(
    genA: (this: Mocha.Context) => ResourceGenerator<A>
  ): Resource<A> {
    return new Resource<A>(genA);
  };

  /**
   * Creates a Resource from a pair of Promise-returning functions.
   *
   * @param setUp asynchronously sets up an A
   * @param tearDown asynchronously tears down an A
   */
  static async = function <A>(
    setUp: (this: Mocha.Context) => Promise<A>,
    tearDown?: (this: Mocha.Context, a: A) => Promise<void>
  ): Resource<A> {
    return Resource.gen<A>(async function* (this: Mocha.Context) {
      const a: A = await setUp.call(this);
      yield a;
      if (tearDown) {
        await tearDown.call(this, a);
      }
    });
  };

  /**
   * Creates a resource from a pair of synchronous functions.
   *
   * @param setUp synchronously sets up an A
   * @param tearDown synchronously tears down an A
   */
  static sync = function <A>(
    setUp: (this: Mocha.Context) => A,
    tearDown?: (this: Mocha.Context, a: A) => void
  ): Resource<A> {
    return Resource.gen<A>(async function* (this: Mocha.Context) {
      const a: A = await new Promise((res) => res(setUp.call(this)));
      yield a;
      if (tearDown) {
        await new Promise((res) => res(tearDown.call(this, a)));
      }
    });
  };

  /**
   * Creates a resource from a pair of NodeJS callbacks.
   *
   * @param setUp asynchronously sets up an A
   * @param tearDown asynchronously tears down an A
   */
  static node = function <A>(
    setUp: (this: Mocha.Context, cb: NodeCB<A>) => void,
    tearDown?: (this: Mocha.Context, a: A, cb: NodeCB<void>) => void
  ): Resource<A> {
    return Resource.gen<A>(async function* (this: Mocha.Context) {
      const a: A = await new Promise((resolve, reject) => {
        setUp.call(this, (err, a) => (err ? reject(err) : resolve(a)));
      });

      yield a;
      if (tearDown) {
        await new Promise<void>((resolve, reject) => {
          tearDown.call(this, a, (err) => (err ? reject(err) : resolve()));
        });
      }
    });
  };

  private constructor(
    readonly genA: (this: Mocha.Context) => ResourceGenerator<A>
  ) {}
}

export function hookInto<A>(
  beforeHook: Mocha.HookFunction,
  afterHook: Mocha.HookFunction,
  optName: string | Resource<A>,
  optRes?: Resource<A>
): Current<A> {
  const [resource, name]: [Resource<A>, string?] =
    optName !== undefined && optRes !== undefined
      ? [optRes, optName as string]
      : [optName as Resource<A>, undefined];

  let hasValue = false;
  let generator: ResourceGenerator<A>;
  let value: A;

  const beforeFn = async function (this: Mocha.Context) {
    generator = resource.genA.call(this);

    // pull the first value
    const first = await generator.next();
    if (first.done) {
      throw Error("Generator function should yield exactly once");
    }

    value = first.value;
    hasValue = true;
  };

  const afterFn = async function () {
    hasValue = false;
    // run the generator to completion
    const next = await generator.next();

    if (!next.done) {
      throw Error("Generator function should yield exactly once");
    }
  };

  if (name === undefined) {
    beforeHook(beforeFn);
    afterHook(afterFn);
  } else {
    beforeHook(name, beforeFn);
    afterHook(name, afterFn);
  }

  return () => {
    if (!hasValue) {
      throw Error(
        "Resource is not in scope of a test. Are you within an it() execution?"
      );
    }

    return value;
  };
}

/**
 * Hooks the given resource generator into Mocha `before` and `after` to create
 * and destroy a resource, respectively.
 *
 * @param res async generator function for creating and destroying resources
 * @see Resource
 */
export function before<A>(res: Resource<A>): Current<A>;

/**
 * Hooks the given resource generator into Mocha `before` and `after` to create
 * and destroy a resource, respectively.
 *
 * @param name test describe name
 * @param res async generator function for creating and destroying resources
 * @see Resource
 */
export function before<A>(name: string, res: Resource<A>): Current<A>;

export function before<A>(
  optName: string | Resource<A>,
  optRes?: Resource<A>
): Current<A> {
  return hookInto(global.before, global.after, optName, optRes);
}

/**
 * Hooks the given resource generator into Mocha `beforeEach` and `afterEach`
 * to create and destroy a resource, respectively.
 *
 * @param res async generator function for creating and destroying resources
 * @see Resource
 */
export function beforeEach<A>(res: Resource<A>): Current<A>;

/**
 * Hooks the given resource generator into Mocha `beforeEach` and `afterEach`
 * to create and destroy a resource, respectively.
 *
 * @param name test describe name
 * @param res async generator function for creating and destroying resources
 * @see Resource
 */
export function beforeEach<A>(name: string, res: Resource<A>): Current<A>;

export function beforeEach<A>(
  optName: string | Resource<A>,
  optRes?: Resource<A>
): Current<A> {
  return hookInto(global.beforeEach, global.afterEach, optName, optRes);
}

export const mokapot = {
  // hooks
  before,
  beforeEach,

  // resources
  async: Resource.async,
  sync: Resource.sync,
  node: Resource.node,
  gen: Resource.gen,

  // plumbing:
  Resource,
  hookInto,
};
