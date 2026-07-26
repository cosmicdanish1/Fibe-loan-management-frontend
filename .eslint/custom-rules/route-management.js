// Custom ESLint rule to prevent hardcoded routes
// This should be added to your ESLint configuration

module.exports = {
    rules: {
        'no-hardcoded-routes': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Disallow hardcoded route strings - use ROUTES constants instead',
                    category: 'Best Practices',
                    recommended: true
                },
                messages: {
                    noHardcodedRoute: "Hardcoded route '{{route}}' detected. Use ROUTES.{{suggestion}} from config/routes.ts instead."
                },
                schema: []
            },
            create: function (context) {
                const routePatterns = [
                    /^\/[a-z-]+(?:\/[a-z-]+)*$/,
                    /^\/administration\//,
                    /^\/transaction\//,
                    /^\/reports\//,
                    /^\/masters\//,
                    /^\/utility\//,
                    /^\/help\//,
                    /^\/exit\//
                ];

                function isLikelyRoute(value) {
                    return routePatterns.some(pattern => pattern.test(value));
                }

                function suggestConstantName(route) {
                    return route
                        .replace(/^\//, '')
                        .replace(/\//g, '_')
                        .replace(/-/g, '_')
                        .toUpperCase();
                }

                return {
                    Literal(node) {
                        if (typeof node.value === 'string' && isLikelyRoute(node.value)) {
                            const parent = node.parent;
                            const sourceCode = context.getSourceCode();
                            const text = sourceCode.getText(node);

                            if (text.includes('ROUTES.')) {
                                return;
                            }

                            const isInRouteContext =
                                (parent.type === 'JSXAttribute' && parent.name.name === 'path') ||
                                (parent.type === 'Property' && parent.key.name === 'route') ||
                                (parent.type === 'Property' && parent.key.name === 'path');

                            if (isInRouteContext) {
                                context.report({
                                    node,
                                    messageId: 'noHardcodedRoute',
                                    data: {
                                        route: node.value,
                                        suggestion: suggestConstantName(node.value)
                                    }
                                });
                            }
                        }
                    }
                };
            }
        }
    }
};
