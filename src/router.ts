import { createRootRoute, createRoute, createRouter } from '@octanejs/tanstack-router'
import App from './App.btsx'
import { Overview, QuotePicker, QuoteWizard, MobileQuote, Policies, Claims, ClaimNew, Analytics, Tasks } from './pages'

const rootRoute = createRootRoute({ component: App })


const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Overview }),
  createRoute({ getParentRoute: () => rootRoute, path: '/quote', component: QuotePicker }),
  createRoute({ getParentRoute: () => rootRoute, path: '/quote/$product', component: QuoteWizard }),
  createRoute({ getParentRoute: () => rootRoute, path: '/mobile', component: MobileQuote }),
  createRoute({ getParentRoute: () => rootRoute, path: '/policies', component: Policies }),
  createRoute({ getParentRoute: () => rootRoute, path: '/claims', component: Claims }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/claims/new',
    component: ClaimNew,
    validateSearch: (search: Record<string, unknown>): { quote?: string } => (typeof search.quote === 'string' ? { quote: search.quote } : {})
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/analytics', component: Analytics }),
  createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: Tasks })
])

export const router = createRouter({ routeTree })

declare module '@octanejs/tanstack-router' {
  interface Register {
    router: typeof router
  }
}
