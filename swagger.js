import swaggerAutogen from "swagger-autogen";

const doc = {
  openapi: "3.0.0",
  info: {
    title: "Metacorp API",
    description: "Metacorp API documentation",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:3000", description: "Local server" },
    { url: "https://hoardlinks-backend.onrender.com", description: "Render server" },
  ],
  components: {
    securitySchemes: {
      access_token: {
        type: "apiKey",
        name: "access_token",
        in: "header",
      },
    },
  },
  security: [{ access_token: [] }],
};

const outputFile = "./swagger-output.json";

/**
 * 🔥 MUST POINT TO COMPILED JS ENTRY FILE
 */
const endpointsFiles = ["./dist/index.js"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);
