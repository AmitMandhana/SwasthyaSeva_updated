# API Annotation Format Reference

Reference for backend `#swagger` annotations used with swagger-autogen.

## swagger-autogen Syntax

Swagger annotations are placed as block comments **inside** route handler calls. Each annotation follows the format:

```js
/* #swagger.property = value */
```

Multiple annotations can appear in the same handler. They must be inside the route callback body.

```js
router.get('/users', async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.summary = 'List all users' */
  // ... handler logic
});
```

---

## Required Annotations Per Route

Every route handler should include these annotations at minimum:

### `#swagger.tags`

Array of tag names that group the route in the Swagger UI.

```js
/* #swagger.tags = ['Users'] */
/* #swagger.tags = ['Appointments', 'Scheduling'] */
```

### `#swagger.summary`

Short one-line description of what the endpoint does.

```js
/* #swagger.summary = 'Get user by ID' */
```

### `#swagger.description` (optional)

Longer description with additional detail.

```js
/* #swagger.description = 'Retrieves a user by their unique ID. Returns 404 if not found.' */
```

### `#swagger.parameters`

Request parameters (body, path, query). See the Parameters section below.

### `#swagger.responses`

Response schemas with HTTP status codes. See the Response Schemas section below.

### `#swagger.security`

Authentication requirements. See the Auth Annotations section below.

---

## Parameter Types

### Body Parameters

Used for POST, PUT, and PATCH requests to describe the request body.

```js
/* #swagger.parameters['body'] = {
  in: 'body',
  required: true,
  schema: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '9876543210'
  }
} */
```

With `$ref` for reusable schemas:

```js
/* #swagger.parameters['body'] = {
  in: 'body',
  required: true,
  schema: { $ref: '#/definitions/CreateUser' }
} */
```

### Path Parameters

Used when the route contains dynamic segments like `/users/:id`.

```js
/* #swagger.parameters['id'] = {
  in: 'path',
  required: true,
  type: 'string',
  description: 'User ID'
} */
```

### Query Parameters

Used for filtering, pagination, and search.

```js
/* #swagger.parameters['page'] = {
  in: 'query',
  type: 'integer',
  description: 'Page number',
  default: 1
} */

/* #swagger.parameters['limit'] = {
  in: 'query',
  type: 'integer',
  description: 'Items per page',
  default: 10
} */

/* #swagger.parameters['search'] = {
  in: 'query',
  type: 'string',
  description: 'Search query'
} */
```

---

## Auth Annotations

### Public routes

No security annotation is needed for public routes. The absence of `#swagger.security` indicates the route is publicly accessible.

```js
router.get('/public/health', (req, res) => {
  /* #swagger.tags = ['Health'] */
  /* #swagger.summary = 'Health check' */
  res.json({ status: 'ok' });
});
```

### Protected routes

Use the `bearerAuth` security scheme for routes that require authentication.

```js
/* #swagger.security = [{ "bearerAuth": [] }] */
```

This indicates the route requires a valid JWT bearer token in the `Authorization` header.

---

## Response Schemas

### Success Responses

**200 -- OK** (for GET, PATCH, DELETE):

```js
/* #swagger.responses[200] = {
  description: 'User retrieved successfully',
  schema: {
    success: true,
    data: {
      id: 'abc123',
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
} */
```

**201 -- Created** (for POST):

```js
/* #swagger.responses[201] = {
  description: 'User created successfully',
  schema: {
    success: true,
    data: {
      id: 'abc123',
      name: 'John Doe'
    },
    message: 'User created'
  }
} */
```

### Error Responses

**400 -- Validation Error**:

```js
/* #swagger.responses[400] = {
  description: 'Validation error',
  schema: {
    success: false,
    message: 'Validation failed',
    errors: [
      { field: 'email', message: 'Email is required' },
      { field: 'phone', message: 'Invalid phone number' }
    ]
  }
} */
```

**401 -- Unauthorized**:

```js
/* #swagger.responses[401] = {
  description: 'Unauthorized - missing or invalid token',
  schema: {
    success: false,
    message: 'Unauthorized'
  }
} */
```

**404 -- Not Found**:

```js
/* #swagger.responses[404] = {
  description: 'Resource not found',
  schema: {
    success: false,
    message: 'User not found'
  }
} */
```

**500 -- Server Error**:

```js
/* #swagger.responses[500] = {
  description: 'Internal server error',
  schema: {
    success: false,
    message: 'Something went wrong'
  }
} */
```

---

## Full Route Examples

### GET -- List with pagination

```js
router.get('/users', async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.summary = 'List all users' */
  /* #swagger.description = 'Returns a paginated list of users. Supports search and filtering.' */
  /* #swagger.security = [{ "bearerAuth": [] }] */

  /* #swagger.parameters['page'] = {
    in: 'query',
    type: 'integer',
    description: 'Page number',
    default: 1
  } */
  /* #swagger.parameters['limit'] = {
    in: 'query',
    type: 'integer',
    description: 'Items per page',
    default: 10
  } */
  /* #swagger.parameters['search'] = {
    in: 'query',
    type: 'string',
    description: 'Search by name or email'
  } */

  /* #swagger.responses[200] = {
    description: 'Users retrieved successfully',
    schema: {
      success: true,
      data: [{
        id: 'abc123',
        name: 'John Doe',
        email: 'john@example.com'
      }],
      pagination: {
        page: 1,
        limit: 10,
        total: 50,
        pages: 5
      }
    }
  } */
  /* #swagger.responses[401] = {
    description: 'Unauthorized',
    schema: { success: false, message: 'Unauthorized' }
  } */
  /* #swagger.responses[500] = {
    description: 'Server error',
    schema: { success: false, message: 'Something went wrong' }
  } */

  // ... handler logic
});
```

### POST -- Create resource

```js
router.post('/users', async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.summary = 'Create a new user' */
  /* #swagger.security = [{ "bearerAuth": [] }] */

  /* #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
      role: 'patient'
    }
  } */

  /* #swagger.responses[201] = {
    description: 'User created successfully',
    schema: {
      success: true,
      data: {
        id: 'abc123',
        name: 'John Doe',
        email: 'john@example.com'
      },
      message: 'User created'
    }
  } */
  /* #swagger.responses[400] = {
    description: 'Validation error',
    schema: {
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'Email is required' }]
    }
  } */
  /* #swagger.responses[401] = {
    description: 'Unauthorized',
    schema: { success: false, message: 'Unauthorized' }
  } */
  /* #swagger.responses[500] = {
    description: 'Server error',
    schema: { success: false, message: 'Something went wrong' }
  } */

  // ... handler logic
});
```

### PATCH -- Update resource

```js
router.patch('/users/:id', async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.summary = 'Update a user' */
  /* #swagger.security = [{ "bearerAuth": [] }] */

  /* #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    type: 'string',
    description: 'User ID'
  } */
  /* #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      name: 'Jane Doe',
      email: 'jane@example.com'
    }
  } */

  /* #swagger.responses[200] = {
    description: 'User updated successfully',
    schema: {
      success: true,
      data: {
        id: 'abc123',
        name: 'Jane Doe',
        email: 'jane@example.com'
      },
      message: 'User updated'
    }
  } */
  /* #swagger.responses[400] = {
    description: 'Validation error',
    schema: { success: false, message: 'Validation failed' }
  } */
  /* #swagger.responses[401] = {
    description: 'Unauthorized',
    schema: { success: false, message: 'Unauthorized' }
  } */
  /* #swagger.responses[404] = {
    description: 'User not found',
    schema: { success: false, message: 'User not found' }
  } */
  /* #swagger.responses[500] = {
    description: 'Server error',
    schema: { success: false, message: 'Something went wrong' }
  } */

  // ... handler logic
});
```

### DELETE -- Remove resource

```js
router.delete('/users/:id', async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.summary = 'Delete a user' */
  /* #swagger.security = [{ "bearerAuth": [] }] */

  /* #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    type: 'string',
    description: 'User ID'
  } */

  /* #swagger.responses[200] = {
    description: 'User deleted successfully',
    schema: {
      success: true,
      message: 'User deleted'
    }
  } */
  /* #swagger.responses[401] = {
    description: 'Unauthorized',
    schema: { success: false, message: 'Unauthorized' }
  } */
  /* #swagger.responses[404] = {
    description: 'User not found',
    schema: { success: false, message: 'User not found' }
  } */
  /* #swagger.responses[500] = {
    description: 'Server error',
    schema: { success: false, message: 'Something went wrong' }
  } */

  // ... handler logic
});
```
