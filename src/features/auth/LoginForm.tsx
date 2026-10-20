import { LineChartIcon } from "lucide-react";
import { useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREDENCIALES_DEMO } from "./useAuth";

interface Props {
  onIniciarSesion: (usuario: string, clave: string) => boolean;
}

export function LoginForm({ onIniciarSesion }: Props) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(false);

  function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    const ok = onIniciarSesion(usuario, clave);
    setError(!ok);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChartIcon className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Smurfit Westrock Colombia</CardTitle>
          <CardDescription>Monitor de entorno — tipo de cambio (TRM)</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={manejarEnvio}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="clave">Contraseña</Label>
              <Input id="clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>Usuario o contraseña incorrectos.</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="mt-1">
              Entrar
            </Button>

            <p className="text-xs text-muted-foreground">
              Demo: usuario <code className="font-mono">{CREDENCIALES_DEMO.usuario}</code>, contraseña{" "}
              <code className="font-mono">{CREDENCIALES_DEMO.clave}</code>. No es autenticación real — la
              sesión vive solo en este navegador.
            </p>
            <p className="text-xs text-muted-foreground">
              Prototipo no oficial construido sobre el perfil público de Smurfit Westrock Colombia, sin
              relación ni aval de la empresa.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
