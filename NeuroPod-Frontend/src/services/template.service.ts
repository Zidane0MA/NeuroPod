import api from "./api";
import { Template, CreateTemplateParams } from "@/types/template";

export const templateService = {
  /**
   * Get all templates
   */
  async getTemplates(): Promise<Template[]> {
    try {
      const response = await api.get("/api/templates");
      return response.data;
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(template: CreateTemplateParams): Promise<Template> {
    try {
      const response = await api.post("/templates", template);
      // El backend retorna { message: ..., template: ... }
      return response.data.template || response.data;
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  },

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, template: Partial<CreateTemplateParams>): Promise<Template> {
    try {
      const response = await api.put(`/templates/${id}`, template);
      // El backend retorna { message: ..., template: ... }
      return response.data.template || response.data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      await api.delete(`/templates/${id}`);
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string): Promise<Template> {
    try {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      throw error;
    }
  }
};
