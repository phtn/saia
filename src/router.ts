import { createRootRoute, createRoute, createRouter } from '@octanejs/tanstack-router'
import App from './App.btsx'
import { Overview, QuotePicker, QuoteWizard, MobileQuote, Policies, Claims, ClaimNew, Analytics, Tasks, Notes, Contacts, Crypto } from './pages'

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
  createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: Tasks }),
  createRoute({ getParentRoute: () => rootRoute, path: '/notes', component: Notes }),
  createRoute({ getParentRoute: () => rootRoute, path: '/contacts', component: Contacts }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/crypto',
    component: Crypto,
    validateSearch: (search: Record<string, unknown>): { owner?: string; tab?: 'market' | 'portfolio' | 'wallets' } => ({
      ...(typeof search.owner === 'string' ? { owner: search.owner } : {}),
      ...(search.tab === 'market' || search.tab === 'portfolio' || search.tab === 'wallets' ? { tab: search.tab } : {})
    })
  })
])

export const router = createRouter({ routeTree })

declare module '@octanejs/tanstack-router' {
  interface Register {
    router: typeof router
  }
}
