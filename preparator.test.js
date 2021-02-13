const { defPrep, expectSuccess, app, expectError } = require("./tests/common");
const { HttpError } = require("@apparts/error");
const { HttpCode } = require("./code");
const prepare = require("./preparator");
const request = require("supertest");

describe("Accept request", () => {
  test("Should accept with empty assumptions", async () => {
    const path = defPrep("", {});
    await expectSuccess(path);
  });
  test("Should accept with empty assumptions, too many params", async () => {
    const path = defPrep(":id", {});
    await expectSuccess(path + "9?a=1", { b: "blub" });
  });
});

let counter = 0;
const getCurrentUrl = () => "/b" + counter + "/";
const getNextUrl = () => "/b" + ++counter + "/";

describe("Options.strap", () => {
  test("Should strip out additional params", async () => {
    app.post(
      getNextUrl() + ":tooMuch",
      prepare(
        {},
        async ({ body, query, params }) => {
          if (
            body.tooMuch !== undefined ||
            query.tooMuch !== undefined ||
            params.tooMuch !== undefined
          ) {
            return "nope";
          }
          return "ok";
        },
        { strap: true }
      )
    );
    await expectSuccess(getCurrentUrl() + "9?tooMuch=1", { tooMuch: "blub" });
  });
});

describe("HttpErrors", () => {
  test("Should produce code 400 when HttpError returned", async () => {
    app.post(
      getNextUrl(),
      prepare({}, async () => {
        return new HttpError(400);
      })
    );
    await expectError(getCurrentUrl(), {}, 400, { error: "Bad Request" });
  });
  test("Should produce code 400 when HttpError thrown", async () => {
    app.post(
      getNextUrl(),
      prepare({}, async () => {
        throw new HttpError(400);
      })
    );
    await expectError(getCurrentUrl(), {}, 400, { error: "Bad Request" });
  });

  test("Should produce code 400 and have error field", async () => {
    app.post(
      getNextUrl(),
      prepare({}, async () => {
        return new HttpError(400, "error text");
      })
    );
    await expectError(getCurrentUrl(), {}, 400, { error: "error text" });
  });
  test("Should produce code 400 and have error, description field", async () => {
    app.post(
      getNextUrl(),
      prepare({}, async () => {
        throw new HttpError(400, "error text2", "description, too");
      })
    );
    await expectError(getCurrentUrl(), {}, 400, {
      error: "error text2",
      description: "description, too",
    });
  });
});

describe("Server error", () => {
  test("Should produce custom server error", async () => {
    const consoleMock = jest.spyOn(console, "log").mockImplementation(() => {});

    app.post(
      getNextUrl(),
      prepare({}, async () => {
        throw new Error("ups");
      })
    );
    const res = await request(app)
      .post(getCurrentUrl())
      .expect("Content-Type", "text/plain; charset=utf-8");
    expect(res.text).toMatch(
      /^SERVER ERROR! [0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12} Please consider sending this error-message along with a description of what happend and what you where doing to this email-address: <supportemailaddress goes here>\.$/
    );
    const id = res.text.split(" ")[2];
    expect(res.status).toBe(500);
    const log = JSON.parse(consoleMock.mock.calls[0][0]);
    expect(log.REQUEST.ip).toMatch(/127.0.0.1/);
    expect(log.REQUEST.ua).toMatch(/node-superagent/);
    expect(log.TRACE).toMatch(/Error: ups\n\s*at/);
    expect(log).toMatchObject({
      ID: id,
      USER: "",
      REQUEST: {
        url: getCurrentUrl(),
        method: "POST",
      },
    });
    consoleMock.mockRestore();
  });
});

describe("HttpCodes", () => {
  test("Should produce code 300 when HttpCode(300) returned", async () => {
    app.post(
      getNextUrl(),
      prepare({}, async () => {
        return new HttpCode(300, { test: true });
      })
    );
    await expectError(getCurrentUrl(), {}, 300, { test: true });
  });
});

describe("Function not async", () => {
  test("Should work with normal function as parameter", async () => {
    app.post(
      getNextUrl(),
      prepare({}, () => {
        return "ok";
      })
    );
    await expectSuccess(getCurrentUrl());
  });
});

/*require("./tests/body");
   require("./tests/params");
   require("./tests/query");*/

// - [x] body
// - [x] params
// - [x] query
// - [ ] pass in assertion for unknown thing, crash?
// - [x] pass in wrong value, check for Field missmatch
//   - [x] too few params
//   - [x] wrong type of param
//   - [x] too many params
//   - [x] optional
//   - [x] default
// - [x] check type preparation/transformation for each type
// - [x] test each type
// - [x] test options.strap
// - [x] test HttpError behavior
// - [x] test HttpCode behavior
// - [x] test 500 server error
// - [ ] test non-async function
// - [x] test return body to be JSON encoded
// - [x] check case sensitivity of field name
