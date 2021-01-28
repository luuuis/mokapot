/**
 * Async generator for setting up and tearing down a resource.
 */
export type ResourceGenerator<A> = AsyncGenerator<A, void, void>;

/**
 * Async generator function for setting up and tearing down
 * a resource.
 */
export type ResourceGeneratorCreate<A> = () => ResourceGenerator<A>;

/**
 * Handle to a resource that can be used during a test run.
 */
export type Resource<A> = () => A;

/**
 * Smart constructor to avoid having to write out the type.
 *
 * @param gen async generator function for creating and destroying resources
 */
export function resource<A>(
  gen: ResourceGeneratorCreate<A>
): ResourceGeneratorCreate<A> {
  // wat!
  return gen;
}

/**
 * Lifts a synchronous generator into a resource.
 *
 * @param gen generator function for creating and destroying resources
 */
export function resourceSync<A>(
  gen: () => Generator<A, void, undefined>
): ResourceGeneratorCreate<A> {
  return async function* (this: Mocha.Context) {
    for await (const v of gen.call(this)) {
      yield v;
    }
  };
}

export function hookInto<A>(
  beforeHook: Mocha.HookFunction,
  afterHook: Mocha.HookFunction,
  optName: string | ResourceGeneratorCreate<A>,
  optGen?: ResourceGeneratorCreate<A>
): Resource<A> {
  const [createGen, name] =
    typeof optName !== "undefined" && typeof optGen !== "undefined"
      ? [optGen, optName as string]
      : [optName as ResourceGeneratorCreate<A>, undefined];

  let hasValue = false;
  let generator: ResourceGenerator<A>;
  let resource: A;

  const beforeFn = async function (this: Mocha.Context) {
    generator = createGen.call(this);

    // pull the first value
    const first = await generator.next();
    if (first.done) {
      throw Error("Generator function should yield exactly once");
    }

    resource = first.value;
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
      throw Error("Generator function should yield exactly once");
    }

    return resource;
  };
}

/**
 * Hooks the given resource generator into Mocha `before` and `after` to create
 * and destroy a resource, respectively.
 *
 * @param gen async generator function for creating and destroying resources
 * @see mokapot#resource
 */
export function before<A>(gen: ResourceGeneratorCreate<A>): Resource<A>;

/**
 * Hooks the given resource generator into Mocha `before` and `after` to create
 * and destroy a resource, respectively.
 *
 * @param name test describe name
 * @param gen async generator function for creating and destroying resources
 * @see mokapot#resource
 */
export function before<A>(
  name: string,
  gen: ResourceGeneratorCreate<A>
): Resource<A>;

export function before<A>(
  optName: string | ResourceGeneratorCreate<A>,
  optGen?: ResourceGeneratorCreate<A>
): Resource<A> {
  return hookInto(global.before, global.after, optName, optGen);
}

/**
 * Hooks the given resource generator into Mocha `beforeEach` and `afterEach`
 * to create and destroy a resource, respectively.
 *
 * @param gen async generator function for creating and destroying resources
 * @see mokapot#resource
 */
export function beforeEach<A>(gen: ResourceGeneratorCreate<A>): Resource<A>;

/**
 * Hooks the given resource generator into Mocha `beforeEach` and `afterEach`
 * to create and destroy a resource, respectively.
 *
 * @param name test describe name
 * @param gen async generator function for creating and destroying resources
 * @see mokapot#resource
 */
export function beforeEach<A>(
  name: string,
  gen: ResourceGeneratorCreate<A>
): Resource<A>;

export function beforeEach<A>(
  optName: string | ResourceGeneratorCreate<A>,
  optGen?: ResourceGeneratorCreate<A>
): Resource<A> {
  return hookInto(global.beforeEach, global.afterEach, optName, optGen);
}
