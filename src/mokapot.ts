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
  createGen: ResourceGeneratorCreate<A>,
  before: Mocha.HookFunction,
  after: Mocha.HookFunction
): Resource<A> {
  let hasValue = false;
  let generator: ResourceGenerator<A>;
  let resource: A;

  before(async function (this: Mocha.Context) {
    generator = createGen.call(this);

    // pull the first value
    const first = await generator.next();
    if (first.done) {
      throw Error("Generator function should yield exactly once");
    }

    resource = first.value;
    hasValue = true;
  });

  after(async function () {
    hasValue = false;

    // run the generator to completion
    const next = await generator.next();
    if (!next.done) {
      throw Error("Generator function should yield exactly once");
    }
  });

  return () => {
    if (!hasValue) {
      throw Error("Generator function should yield exactly once");
    }

    return resource;
  };
}

export function before<A>(gen: ResourceGeneratorCreate<A>): Resource<A> {
  return hookInto(gen, global.before, global.after);
}

export function beforeEach<A>(gen: ResourceGeneratorCreate<A>): Resource<A> {
  return hookInto(gen, global.beforeEach, global.afterEach);
}
