import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    version: '1.0.0',
    title: 'metacorp API',
    description: 'metacorp Api documentation',
  },
  components: {
    schemas: {
      salesSchema: {
        items: [
          {
            PKItemID: 'number',
            Qty: 'number',
            Price: 'number',
          },
        ],
        totalAmount: 'number',
        discount: 'number',
      },
      salesReturnSchema: {
        sales: [
          {
            saleId: 'number',
            items: [
              {
                PKItemID: 'number',
                PKSoldItemID: 'number',
                returnQty: 'number',
              },
            ],
          },
        ],
        nonSales: [
          {
            retuurnQty: 'number',
            item: { PKItemID: 'number', Price: 'number' },
          },
        ],
      },
      loginSchema: {
        $email: 'string',
        $password: 'string',
      },
    },
    parameters: {
      q: {
        name: 'q',
        in: 'query',
        schema: {
          type: 'string',
          example: 'apple',
        },
        description: 'Search query for filtering products',
      },
      id: {
        name: 'id',
        in: 'query',
        schema: {
          type: 'number',
          example: '13',
        },
        description: 'Product ID',
      },
      sort: {
        name: 'sort',
        in: 'query',
        schema: {
          type: 'string',
          example: 'date',
        },
        description: 'Sort order for products',
      },
      filter: {
        name: 'filter',
        in: 'query',
        schema: {
          type: 'string',
          example: 'rol',
        },
        description: 'Filter criteria for products',
      },
    },
    examples: {
      loginSchema: {
        value: { email: 'mail@example.com', password: 'password' },
        summary: 'Example of login schema',
      },
    },
    securitySchemes: {
      access_token: {
        type: 'apiKey',
        name: 'access_token',
        in: 'header',
        description: 'Access token required for authentication',
      },
    },
  },
  schemes: ['https', 'http'],
  servers: [
    {
      url: 'https://metacorp.onrender.com',
      description: 'Render server',
    },
    {
      url: 'http://localhost:3001',
      description: 'localhost',
    },
  ],
}

const outputFile = './swagger-output.json'
const routes = ['./src/app.ts']

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

await swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc)
