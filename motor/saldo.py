# -*- coding: utf-8 -*-
"""Mira cuánto saldo queda y deja SOLO los números en la rama `saldo` para que los lea el panel.
Las claves viven en los Secretos de GitHub: el navegador no puede leerlas. Este script nunca imprime ni guarda una clave."""
import base64, json, os, time, urllib.error, urllib.request

REPO = os.environ["GITHUB_REPOSITORY"]
AGENTE = "estudio-videos"


def pedir(url, clave, datos=None, metodo=None):
    q = urllib.request.Request(url, data=datos, method=metodo, headers={"Authorization": "Bearer " + clave, "Content-Type": "application/json", "Accept": "application/json", "User-Agent": AGENTE})
    return json.load(urllib.request.urlopen(q, timeout=30))


def deepseek():
    infos = pedir("https://api.deepseek.com/user/balance", os.environ["DEEPSEEK_API_KEY"]).get("balance_infos") or []
    x = next((i for i in infos if i.get("currency") == "USD"), infos[0])
    return round(float(x["total_balance"]), 2)


def runpod():
    r = pedir("https://api.runpod.io/graphql", os.environ["RUNPOD_API_KEY"], json.dumps({"query": "query{myself{clientBalance}}"}).encode())
    return round(float(r["data"]["myself"]["clientBalance"]), 2)


def seguro(f):
    try: return f()
    except Exception as e:
        print(f.__name__, "no se pudo consultar:", type(e).__name__)   # solo el tipo: el detalle podría traer datos
        return None


def gh(ruta, datos=None, metodo=None):
    return pedir("https://api.github.com/repos/" + REPO + ruta, os.environ["GH_TOKEN"], json.dumps(datos).encode() if datos is not None else None, metodo)


def rama_lista():
    try: gh("/git/ref/heads/saldo")
    except urllib.error.HTTPError as e:
        if e.code != 404: raise
        sha = gh("/git/ref/heads/" + os.environ["GITHUB_REF_NAME"])["object"]["sha"]
        gh("/git/refs", {"ref": "refs/heads/saldo", "sha": sha}, "POST")


def main():
    d = {"deepseek": seguro(deepseek), "runpod": seguro(runpod), "t": int(time.time())}
    rama_lista()
    cuerpo = {"message": "saldo", "branch": "saldo", "content": base64.b64encode(json.dumps(d).encode()).decode()}
    try: cuerpo["sha"] = gh("/contents/saldo.json?ref=saldo")["sha"]
    except urllib.error.HTTPError as e:
        if e.code != 404: raise
    gh("/contents/saldo.json", cuerpo, "PUT")
    print("saldo actualizado")


main()
