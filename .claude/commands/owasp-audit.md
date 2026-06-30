---
description: Audita el backend contra OWASP Top 10
  y genera security-report.md + correction-prompt.md
allowed-tools: Read, Write, Bash(grep*)
---
 
Actúa como Especialista en Seguridad (OWASP).
Lee todos los archivos en @app/api/,
@src/lib/supabase.ts y @next.config.ts.
 
**No modifiques ningún archivo.** Solo audita.
 
Genera `security-report.md` con los hallazgos
ordenados por severidad (CRÍTICO, ALTO, MEDIO,
BAJO). Para cada hallazgo incluye: categoría
OWASP, archivo y línea exacta, evidencia del
código y descripción del impacto real.
 
Al terminar, genera `correction-prompt.md`:
un prompt listo para que un segundo agente
aplique las correcciones en orden de severidad.
 
$ARGUMENTS