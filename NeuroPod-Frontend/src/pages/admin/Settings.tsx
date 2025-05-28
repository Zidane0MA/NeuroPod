
import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsTabs } from "@/components/admin/settings/SettingsTabs";

const AdminSettings = () => {
  return (
    <DashboardLayout title="Configuración">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuración</h1>
        <p className="text-muted-foreground">Gestiona la configuración del sistema</p>
      </div>
      
      <SettingsTabs />
    </DashboardLayout>
  );
};

export default AdminSettings;
