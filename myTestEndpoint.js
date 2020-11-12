const preparator = require("./preparator");
const { prepauthToken, prepauthPW, prepauthTokenJWT } = require("./prepauth");
const { HttpError } = require("@apparts/error");
const express = require("express");

const myEndpoint = preparator(
  {
    body: {
      name: { type: "string", default: "no name" },
    },
    query: {
      filter: { type: "string", optional: true },
    },
    params: {
      id: { type: "id" },
    },
  },
  async ({ body: { name }, query: { filter }, params: { id } }) => {
    if (name.length > 100) {
      return new HttpError(400, "Name too long");
    }
    // filter might not be defined, as it is optional
    if (filter) {
      // Return values are JSONified automatically!
      const resp = {
        arr: [{ a: 1 }, { a: 2 }],
        foo: "really!",
        boo: true,
        objectWithUnknownKeys: {
          baz: filter === "asstring" ? "77" : 77,
          boo: 99,
        },
        objectWithUnknownKeysAndUnknownTypes: {
          baz: 77,
          boo: false,
        },
      };
      if (filter === "kabazplz") {
        resp.kabaz = false;
      }
      return resp;
    }
    // This produces "ok" (literally, with the quotes)
    return "ok";
  }
);
myEndpoint.title = "Testendpoint for multiple purposes";
myEndpoint.description = `Behaves radically different, based on what
 the filter is.`;
myEndpoint.returns = [
  { status: 200, value: "ok" },
  { status: 400, error: "Name too long" },
  {
    status: 200,
    type: "object",
    values: {
      foo: { value: "really!" },
      boo: { type: "bool" },
      kabaz: { type: "bool", optional: true },
      arr: {
        type: "array",
        value: {
          type: "object",
          values: {
            a: { type: "int" },
          },
        },
      },
      objectWithUnknownKeys: {
        type: "object",
        values: "int",
      },
      objectWithUnknownKeysAndUnknownTypes: {
        type: "object",
        values: "/",
      },
    },
  },
];

const myFaultyEndpoint = preparator(
  {
    body: {
      name: { type: "string", default: "no name" },
    },
    query: {
      filter: { type: "string", optional: true },
    },
    params: {
      id: { type: "id" },
    },
  },
  async ({ body: { name }, query: { filter }, params: { id } }) => {
    if (name.length > 100) {
      return new HttpError(400, "Name is too long");
    }
    // filter might not be defined, as it is optional
    if (filter === "wrongType") {
      // Return values are JSONified automatically!
      return {
        arr: [{ a: true }, { a: 2 }],
        boo: true,
      };
    }
    if (filter === "tooMuch") {
      return {
        arr: [{ a: 2 }, { a: 2 }],
        boo: true,
        tooMuch: true,
      };
    }
    if (filter === "tooLittle") {
      return {
        arr: [{ a: 2 }, { a: 2 }],
      };
    }
    // This produces "ok" (literally, with the quotes)
    return "whut?";
  }
);
myFaultyEndpoint.title = "Faulty Testendpoint";
myFaultyEndpoint.description = `Ment to be found to be faulty. It's documentation
does not match it's behavior.`;
myFaultyEndpoint.returns = [
  { status: 200, value: "ok" },
  { status: 400, error: "Name too long" },
  {
    status: 200,
    type: "object",
    values: {
      boo: { type: "bool" },
      arr: {
        type: "array",
        value: {
          type: "object",
          values: {
            a: { type: "int" },
          },
        },
      },
    },
  },
];

const myTypelessEndpoint = preparator({}, async ({}) => {
  return "ok";
});
myTypelessEndpoint.title = "Typeless endpoint";
myTypelessEndpoint.description = `This endpoint is typeless but not
pointless.`;

const myPwAuthenticatedEndpoint = prepauthPW({}, async ({}) => {
  return "ok";
});
const myTokenAuthenticatedEndpoint = prepauthToken({}, async ({}) => {
  return "ok";
});
const myJWTAuthenticatedEndpoint = prepauthTokenJWT("")({}, async ({}) => {
  return "ok";
});

myPwAuthenticatedEndpoint.title = "Endpoint with Pw Authentication";
myTokenAuthenticatedEndpoint.title = "Endpoint with Token Authentication";
myJWTAuthenticatedEndpoint.title = "Endpoint with JWT Authentication";
myPwAuthenticatedEndpoint.description =
  "You shall not pass, unless you have a password.";
myTokenAuthenticatedEndpoint.description =
  "You shall not pass, unless you have a token.";
myJWTAuthenticatedEndpoint.description =
  "You shall not pass, unless you have a JWT.";

const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.post("/v/1/endpoint/:id", myEndpoint);
app.post("/v/1/faultyendpoint/:id", myFaultyEndpoint);
app.post("/v/1/typelessendpoint", myTypelessEndpoint);

app.post("/v/1/withpw", myPwAuthenticatedEndpoint);
app.post("/v/1/withtoken", myTokenAuthenticatedEndpoint);
app.post("/v/1/withjwt", myJWTAuthenticatedEndpoint);

module.exports = { myEndpoint, myFaultyEndpoint, myTypelessEndpoint, app };
