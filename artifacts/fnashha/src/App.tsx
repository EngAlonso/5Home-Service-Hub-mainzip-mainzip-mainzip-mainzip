import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import RegisterCustomer from "@/pages/auth/register-customer";
import RegisterTechnician from "@/pages/auth/register-technician";

import CustomerLayout from "@/pages/customer/layout";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerRequests from "@/pages/customer/requests";
import CustomerNewRequest from "@/pages/customer/new-request";
import CustomerRequestDetail from "@/pages/customer/request-detail";
import CustomerChat from "@/pages/customer/chat";
import CustomerProfile from "@/pages/customer/profile";
import CustomerSupport from "@/pages/customer/support";

import TechnicianLayout from "@/pages/technician/layout";
import TechnicianDashboard from "@/pages/technician/dashboard";
import TechnicianRequests from "@/pages/technician/requests";
import TechnicianOffers from "@/pages/technician/offers";
import TechnicianRequestDetail from "@/pages/technician/request-detail";
import TechnicianChat from "@/pages/technician/chat";
import TechnicianWallet from "@/pages/technician/wallet";
import TechnicianCompleted from "@/pages/technician/completed";
import TechnicianProfile from "@/pages/technician/profile";
import TechnicianSupport from "@/pages/technician/support";

import AdminLayout from "@/pages/admin/layout";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminTechnicians from "@/pages/admin/technicians";
import AdminTechnicianDetail from "@/pages/admin/technician-detail";
import AdminRequests from "@/pages/admin/requests";
import AdminRequestDetail from "@/pages/admin/request-detail";
import AdminServices from "@/pages/admin/services";
import AdminLocations from "@/pages/admin/locations";
import AdminCommissionRanges from "@/pages/admin/commission-ranges";
import AdminPoints from "@/pages/admin/points";
import AdminSupport from "@/pages/admin/support";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminCms from "@/pages/admin/cms";
import AdminBanners from "@/pages/admin/banners";
import AdminStaff from "@/pages/admin/staff";
import AdminLogs from "@/pages/admin/logs";
import AdminRejectedTechnicians from "@/pages/admin/rejected-technicians";

import HowItWorks from "@/pages/how-it-works";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import FAQ from "@/pages/faq";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedCustomer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCustomer } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isCustomer) return <Redirect to="/login" />;
  return <>{children}</>;
}

function ProtectedTechnician({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isTechnician } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isTechnician) return <Redirect to="/login" />;
  return <>{children}</>;
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isAdmin) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/register/customer" component={RegisterCustomer} />
      <Route path="/register/technician" component={RegisterTechnician} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />

      {/* Customer routes */}
      <Route path="/customer">
        {() => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerDashboard />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>
      <Route path="/customer/requests">
        {() => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerRequests />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>
      <Route path="/customer/requests/new">
        {() => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerNewRequest />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>
      <Route path="/customer/requests/:id">
        {(params) => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerRequestDetail id={params.id} />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>
      <Route path="/customer/chat/:requestId">
        {(params) => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerChat requestId={params.requestId} />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>
      <Route path="/customer/profile">
        {() => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerProfile />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>
      <Route path="/customer/support">
        {() => (
          <ProtectedCustomer>
            <CustomerLayout>
              <CustomerSupport />
            </CustomerLayout>
          </ProtectedCustomer>
        )}
      </Route>

      {/* Technician routes */}
      <Route path="/technician">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianDashboard />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/requests">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianRequests />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/offers">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianOffers />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/requests/:id">
        {(params) => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianRequestDetail id={params.id} />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/chat/:requestId">
        {(params) => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianChat requestId={params.requestId} />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/wallet">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianWallet />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/completed">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianCompleted />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/profile">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianProfile />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>
      <Route path="/technician/support">
        {() => (
          <ProtectedTechnician>
            <TechnicianLayout>
              <TechnicianSupport />
            </TechnicianLayout>
          </ProtectedTechnician>
        )}
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/technicians">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminTechnicians />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/technicians/:id">
        {(params) => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminTechnicianDetail id={params.id} />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/requests">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminRequests />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/requests/:id">
        {(params) => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminRequestDetail id={params.id} />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/services">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminServices />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/locations">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminLocations />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/commission-ranges">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminCommissionRanges />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/points">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminPoints />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/support">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminSupport />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/analytics">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminAnalytics />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/cms">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminCms />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/banners">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminBanners />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/staff">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminStaff />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/logs">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminLogs />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>
      <Route path="/admin/rejected-technicians">
        {() => (
          <ProtectedAdmin>
            <AdminLayout>
              <AdminRejectedTechnicians />
            </AdminLayout>
          </ProtectedAdmin>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
