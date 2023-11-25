module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'max-len': 0,
    'max-classes-per-file': 0,
    'quotes': 0,
    'no-restricted-syntax': [
      2,
      {
        "selector": "ForInStatement",
        "message": "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array."
      },
      {
        "selector": "LabeledStatement",
        "message": "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand."
      },
      {
        "selector": "WithStatement",
        "message": "`with` is disallowed in strict mode because it makes code impossible to predict and optimize."
      },
      {
        "selector": "AssignmentExpression[left.property.name=/(inner|outer)HTML/]",
        "message": "innerHTML is unsafe (XSS)",
      },
      {
        "selector": "CallExpression[callee.property.name=insertAdjacentHTML]",
        "message": "insertAdjacentHTML is unsafe (XSS)",
      },
    ],
    'no-param-reassign': 0,
    'no-console': 0,
    'prefer-template': 0,
    'prefer-destructuring': 1,
    'no-plusplus': 0,
    'prefer-spread': 0,
    'no-bitwise': 0,
    "strict": 0,
    "no-continue": 0,
    "no-underscore-dangle": 0,
    "no-useless-return": 1,
    "no-else-return": 1,
    "no-undef": 1
  },
};
