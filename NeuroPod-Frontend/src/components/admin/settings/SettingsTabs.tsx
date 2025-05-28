
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User,
  Settings as SettingsIcon, 
  DollarSign, 
  HardDrive, 
  ServerCog
} from "lucide-react";
import { ProfileSettings } from "./ProfileSettings";
import { SystemSettings } from "./SystemSettings";
import { PricingSettings } from "./PricingSettings";
import { LogsSettings } from "./LogsSettings";

export const SettingsTabs = () => {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <div className="border rounded-md mb-3 p-1 bg-muted">
        <ScrollArea className="w-full" orientation="horizontal">
          <div className="flex w-full justify-center">
            <TabsList className="bg-transparent">
              <TabsTrigger value="profile" className="flex gap-1 items-center">
                <User className="h-3.5 w-3.5" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="system" className="flex gap-1 items-center">
                <ServerCog className="h-3.5 w-3.5" />
                Sistema
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex gap-1 items-center">
                <DollarSign className="h-3.5 w-3.5" />
                Precios
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex gap-1 items-center">
                <HardDrive className="h-3.5 w-3.5" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>
        </ScrollArea>
      </div>
      
      <TabsContent value="profile" className="space-y-3">
        <ProfileSettings />
      </TabsContent>
      
      <TabsContent value="system" className="space-y-4">
        <SystemSettings />
      </TabsContent>
      
      <TabsContent value="pricing" className="space-y-4">
        <PricingSettings />
      </TabsContent>
      
      <TabsContent value="logs" className="space-y-4">
        <LogsSettings />
      </TabsContent>
    </Tabs>
  );
};
