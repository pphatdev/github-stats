import type { Application } from 'express';

type RouteInfo = {
    method: string;
    path: string;
    requiredParams?: string[];
    optionalParams?: string[];
    payload?: string | null;
    example?: string;
};

export const getRoutes = (app: Application): RouteInfo[] => {
    const routes: RouteInfo[] = [];
    const router = (app as any)._router;
    const stack = router?.stack ?? [];

    for (const layer of stack) {
        if ('route' in layer && layer.route) {
            const routePath = layer.route.path ?? '';
            const methods = Object.keys(layer.route.methods ?? {}).filter((method) => layer.route?.methods?.[method]);
            for (const method of methods) {
                routes.push({ 
                    method: method.toUpperCase(), 
                    path: routePath
                });
            }
        } else if ('name' in layer && layer.name === 'router' && layer.handle?.stack) {
            for (const nestedLayer of layer.handle.stack) {
                if (nestedLayer.route) {
                    const routePath = nestedLayer.route.path ?? '';
                    const methods = Object.keys(nestedLayer.route.methods ?? {}).filter((method) => nestedLayer.route?.methods?.[method]);
                    for (const method of methods) {
                        routes.push({ 
                            method: method.toUpperCase(), 
                            path: routePath
                        });
                    }
                }
            }
        }
    }

    routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    return routes;
};
