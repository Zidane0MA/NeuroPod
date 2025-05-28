```bat
                {tpl.description && (
                  <div className="mb-2">
                    <strong>Descripción:</strong>
                    <div className="prose prose-sm max-w-none mt-1">
                      <ReactMarkdown>{tpl.description}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {tpl.description && (
                  <div className="prose prose-sm max-w-none mt-2 border-t pt-2 text-muted-foreground">
                    <ReactMarkdown>{tpl.description}</ReactMarkdown>
                  </div>
                )}
```