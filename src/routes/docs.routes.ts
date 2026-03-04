import { GraphController } from "../controllers/graph.js";
import { LanguageController } from "../controllers/languages.js";
import { StatsController } from "../controllers/stats.js";
import { getProjectBadgeRouteDocs } from "./project-badge.routes.js";
import { getUserBadgeRouteDocs } from "./user-badge.routes.js";

type RouteInfo = {
    method: string;
    path: string;
    requiredParams?: string[];
    optionalParams?: string[];
    payload?: string | null;
    example?: string;
};

const routeDocs: Record<string, Omit<RouteInfo, 'method' | 'path'>> = {
    'GET /stats': StatsController.routeDocs,
    'GET /languages': LanguageController.routeDocs,
    'GET /graph': GraphController.routeDocs,
    // User badge routes
    ...getUserBadgeRouteDocs(),
    // Project badge routes
    ...getProjectBadgeRouteDocs(),
};

export const getRoutes = (app: Express.Application): RouteInfo[] => {
    const routes: RouteInfo[] = [];
    const router = (app as { _router?: { stack?: Array<{ route?: { path?: string; methods?: Record<string, boolean> } } | { name?: string; handle?: { stack?: Array<{ route?: { path?: string; methods?: Record<string, boolean> } }> } }> } })._router;
    const stack = router?.stack ?? [];

    for (const layer of stack) {
        if ('route' in layer && layer.route) {
            const routePath = layer.route.path ?? '';
            const methods = Object.keys(layer.route.methods ?? {}).filter((method) => layer.route?.methods?.[method]);
            for (const method of methods) {
                const routeKey = `${method.toUpperCase()} ${routePath}`;
                routes.push({ method: method.toUpperCase(), path: routePath, ...routeDocs[routeKey] });
            }
        } else if ('name' in layer && layer.name === 'router' && layer.handle?.stack) {
            for (const nestedLayer of layer.handle.stack) {
                if (nestedLayer.route) {
                    const routePath = nestedLayer.route.path ?? '';
                    const methods = Object.keys(nestedLayer.route.methods ?? {}).filter((method) => nestedLayer.route?.methods?.[method]);
                    for (const method of methods) {
                        const routeKey = `${method.toUpperCase()} ${routePath}`;
                        routes.push({ method: method.toUpperCase(), path: routePath, ...routeDocs[routeKey] });
                    }
                }
            }
        }
    }

    routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    return routes;
};
