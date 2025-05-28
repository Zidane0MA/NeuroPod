export interface PortMapping {
  port: number;
  serviceName: string;
}

export interface Template {
  id: string;
  name: string;
  dockerImage: string;
  httpPorts: PortMapping[];
  tcpPorts: PortMapping[];
  containerDiskSize: number;
  volumeDiskSize: number;
  volumePath: string;
  description: string; // markdown
}

export type CreateTemplateParams = Omit<Template, 'id'>;
