import { assert } from "chai";
import * as sinon from "sinon";

import { mokapot, Resource } from "./mokapot";

describe("mokapot", function () {
  describeInterface("mokapot.async", {
    title: mokapot.async(async function (this: Mocha.Context) {
      return this.test?.title;
    }),
    naturals: ((n) => mokapot.async<number>(async () => n++))(0),
    bracket: (create: () => void, destroy: () => void) =>
      mokapot.async(
        async () => {
          create();
        },
        async () => {
          destroy();
        }
      ),
  });

  describeInterface("mokapot.sync", {
    title: mokapot.sync(function (this: Mocha.Context) {
      return this.test?.title;
    }),
    naturals: ((n: number) => mokapot.sync<number>(() => n++))(0),
    bracket: (create: () => void, destroy: () => void) =>
      mokapot.sync(create, destroy),
  });

  describeInterface("mokapot.node", {
    title: mokapot.node(function (this: Mocha.Context, cb) {
      cb(null, this.test?.title);
    }),
    naturals: ((n) =>
      mokapot.node<number>((cb) => setImmediate(cb, null, n++)))(0),
    bracket: (create: () => void, destroy: () => void) =>
      mokapot.node<void>(
        (cb) => {
          create();
          cb(null);
        },
        (_, cb) => {
          destroy();
          cb(null);
        }
      ),
  });

  describeInterface("mokapot.gen", {
    title: mokapot.gen(async function* (this: Mocha.Context) {
      yield this.test?.title;
    }),
    naturals: ((n) =>
      mokapot.gen<number>(async function* () {
        yield n++;
      }))(0),
    bracket: (create: () => void, destroy: () => void) =>
      mokapot.gen(async function* () {
        create();
        yield;
        destroy();
      }),
  });
});

type Bracket = (create: () => void, destroy: () => void) => Resource<void>;

function describeInterface(
  name: string,
  {
    title,
    naturals,
    bracket,
  }: {
    title: Resource<string | undefined>;
    naturals: Resource<number>;
    bracket: Bracket;
  }
) {
  describe(name, function () {
    const mochaTestTitle = title;
    const asyncNaturalNumber = naturals;

    describe("#before", function () {
      const number = mokapot.before(asyncNaturalNumber);
      const title = mokapot.before(mochaTestTitle);

      it("should run in the BEFORE context", function () {
        assert.equal(
          title(),
          `"before all" hook: beforeFn for "should run in the BEFORE context"`
        );
      });

      it("should set up a new resource for the first test", function () {
        assert.equal(number(), 0);
        assert.equal(number(), 0);
      });

      it("should reuse the same resource for the second test", function () {
        assert.equal(number(), 0);
        assert.equal(number(), 0);
      });

      describe("resource life cycle", function () {
        const create = sinon.stub();
        const destroy = sinon.stub();

        before(function shouldCreateBeforeFirstTest() {
          sinon.assert.notCalled(create);
          sinon.assert.notCalled(destroy);
        });

        mokapot.before(bracket(create, destroy));

        it("should have been created for the first test", function () {
          sinon.assert.calledOnce(create);
          sinon.assert.notCalled(destroy);
        });

        it("should reuse created resource for the second test", function () {
          sinon.assert.calledOnce(create);
          sinon.assert.notCalled(destroy);
        });

        after(function shouldDestroyAfterLastTest() {
          sinon.assert.calledOnce(create);
          sinon.assert.calledOnce(destroy);
        });
      });
    });

    describe("#before with name", function () {
      const title = mokapot.before("NAME", mochaTestTitle);

      it("should run in the BEFORE context", function () {
        assert.equal(
          title(),
          '"before all" hook: NAME for "should run in the BEFORE context"'
        );
      });
    });

    describe("#beforeEach", function () {
      const context = mokapot.beforeEach(mochaTestTitle);
      const number = mokapot.beforeEach(asyncNaturalNumber);

      it("should set up a new resource for the first test", function () {
        assert.equal(number(), 1);
        assert.equal(number(), 1);
      });

      it("should set up a new resource for the second test", function () {
        assert.equal(number(), 2);
        assert.equal(number(), 2);
      });

      it("should run in the BEFORE_EACH context", function () {
        assert.equal(
          context(),
          '"before each" hook: beforeFn for "should run in the BEFORE_EACH context"'
        );
      });

      describe("resource life cycle", function () {
        const create = sinon.stub();
        const destroy = sinon.stub();

        before(function shouldCreateBeforeFirstTest() {
          sinon.assert.notCalled(create);
          sinon.assert.notCalled(destroy);
        });

        mokapot.beforeEach(bracket(create, destroy));

        beforeEach(function shouldCreateBeforeEachTest() {
          assert.equal(create.callCount, destroy.callCount + 1);
        });

        afterEach(function shouldDestroyAfterEachTest() {
          assert.equal(create.callCount, destroy.callCount);
        });

        it("should create new resource for the first test", function () {
          sinon.assert.calledOnce(create);
          sinon.assert.notCalled(destroy);
        });

        it("should create new resource for the second test", function () {
          sinon.assert.calledTwice(create);
          sinon.assert.calledOnce(destroy);
        });

        after(function shouldDestroyAfterEachTest() {
          sinon.assert.calledTwice(create);
          sinon.assert.calledTwice(destroy);
        });
      });
    });

    describe("#beforeEach with name", function () {
      const title = mokapot.beforeEach("THE_NAME", mochaTestTitle);

      it("should run in the BEFORE_EACH context", function () {
        assert.equal(
          title(),
          '"before each" hook: THE_NAME for "should run in the BEFORE_EACH context"'
        );
      });
    });
  });
}
