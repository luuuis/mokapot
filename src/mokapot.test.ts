import { assert } from "chai";
import * as sinon from "sinon";

import * as mokapot from "./mokapot";

describe("mokapot", function () {
  describe("#resource", function () {
    const asyncNaturalNumber = ((n: number) =>
      mokapot.resource<number>(async function* () {
        yield await new Promise((resolve) =>
          setTimeout(() => {
            resolve(n++); // 0, 1, 2, 3, ...
          }, 10)
        );
      }))(100);

    describe("#before", function () {
      const number = mokapot.before(asyncNaturalNumber);

      it("should set up a new resource for the first test", function () {
        assert.equal(number(), 100);
        assert.equal(number(), 100);
      });

      it("should reuse the same resource for the second test", function () {
        assert.equal(number(), 100);
        assert.equal(number(), 100);
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

    describe("#beforeEach", function () {
      const number = mokapot.beforeEach(asyncNaturalNumber);

      it("should set up a new resource for the first test", function () {
        assert.equal(number(), 101);
        assert.equal(number(), 101);
      });

      it("should set up a new resource for the second test", function () {
        assert.equal(number(), 102);
        assert.equal(number(), 102);
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
  });

  describe("#resourceSync", function () {
    const naturalNumber = ((n: number) =>
      mokapot.resourceSync<number>(function* () {
        yield n++; // 0, 1, 2, 3, ...
      }))(0);

    describe("#before", function () {
      const number = mokapot.before(naturalNumber);

      it("should set up a new resource for the first test", function () {
        assert.equal(number(), 0);
        assert.equal(number(), 0);
      });

      it("should reuse the same resource for the second test", function () {
        assert.equal(number(), 0);
        assert.equal(number(), 0);
      });
    });

    describe("#beforeEach", function () {
      const number = mokapot.beforeEach(naturalNumber);

      it("should set up a new resource for the first test", function () {
        assert.equal(number(), 1);
        assert.equal(number(), 1);
      });

      it("should set up a new resource for the second test", function () {
        assert.equal(number(), 2);
        assert.equal(number(), 2);
      });
    });
  });
});

function bracket(create: () => void, destroy: () => void) {
  return mokapot.resource<string>(async function* () {
    create();
    yield "ok";
    destroy();
  });
}
