# -*- coding: utf-8 -*-
"""HERRAMIENTA DEL ESTUDIO: espera UNA sola vez hasta que pase algo (en vez de sleep + ls + tail una y otra vez).
   python <APP>/tools/esperar.py --log <archivo.log> [--busca "EXIT|FIN|✓|Traceback|Error"]   termina cuando el log tiene esa palabra
   python <APP>/tools/esperar.py --existe <archivo>                                          termina cuando el archivo existe (y dejó de crecer)
   python <APP>/tools/esperar.py --cuenta "<carpeta>/*.jpg" <N>                              termina cuando hay ≥ N archivos
   Opciones: --max <seg> (por defecto 540 = 9 min; llamala con timeout 600000). Se pueden combinar: termina con la PRIMERA que se cumpla.
Imprime UNA línea con qué pasó (y las últimas líneas del log si corresponde). Mientras espera NO gasta nada.
Si devuelve "sigue esperando", hacé otra cosa útil (fotos, prompts, plan) y volvé a llamarla: nunca sleep en bucle."""
import glob, os, re, sys, time
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

a = sys.argv[1:]
def opt(k, n=1):
    if k not in a: return None
    i = a.index(k); return a[i + 1] if n == 1 else a[i + 1:i + 1 + n]
log, busca, existe, cuenta = opt("--log"), opt("--busca") or r"EXIT|FIN|✓|Traceback|Error|⛔|listo|LISTO|final:", opt("--existe"), opt("--cuenta", 2)
MAX = float(opt("--max") or 540)
if not (log or existe or cuenta): print(__doc__); sys.exit(1)
t0 = time.time(); tam = -1
while True:
    if log and os.path.exists(log):
        txt = open(log, encoding="utf8", errors="ignore").read()
        m = list(re.finditer(busca, txt))
        if m:
            cola = "\n".join(txt.strip().splitlines()[-6:])
            print(f"✓ el log tiene '{m[-1].group(0)}' ({time.time() - t0:.0f} s):\n{cola}"); sys.exit(0)
    if existe and os.path.exists(existe):
        s = os.path.getsize(existe)
        if s > 0 and s == tam: print(f"✓ existe {existe} ({s / 1e6:.1f} MB, {time.time() - t0:.0f} s)"); sys.exit(0)
        tam = s
    if cuenta:
        n = len(glob.glob(cuenta[0], recursive=True))
        if n >= int(cuenta[1]): print(f"✓ hay {n} archivos ({time.time() - t0:.0f} s)"); sys.exit(0)
    if time.time() - t0 > MAX:
        det = []
        if log: det.append("log: " + (open(log, encoding="utf8", errors="ignore").read().strip().splitlines() or ["(vacío)"])[-1][:200] if os.path.exists(log) else "log: todavía no existe")
        if cuenta: det.append(f"archivos: {len(glob.glob(cuenta[0], recursive=True))}/{cuenta[1]}")
        if existe: det.append("archivo: " + ("creciendo" if os.path.exists(existe) else "todavía no existe"))
        print(f"… sigue esperando tras {MAX:.0f} s · " + " · ".join(det) + " → hacé otra cosa útil y volvé a llamar"); sys.exit(0)
    time.sleep(5)
