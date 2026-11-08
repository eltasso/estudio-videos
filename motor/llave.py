# -*- coding: utf-8 -*-
"""Lleva las claves al navegador del usuario CIFRADAS con un candado que generó ese navegador (RSA-OAEP 2048 + AES-GCM).
Solo ese navegador tiene la llave para abrirlo; el paquete va a una rama suelta `llave-<pedido>` que el panel borra apenas lo lee.
Nunca imprime ni guarda una clave en claro."""
import base64, datetime, json, os, re, time, urllib.error, urllib.request
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

REPO = os.environ["GITHUB_REPOSITORY"]
b64 = lambda b: base64.b64encode(b).decode()


def gh(ruta, datos=None, metodo=None):
    q = urllib.request.Request("https://api.github.com/repos/" + REPO + ruta, data=json.dumps(datos).encode() if datos is not None else None, method=metodo,
                               headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"], "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "estudio-videos"})
    with urllib.request.urlopen(q, timeout=30) as r:
        t = r.read()
        return json.loads(t) if t else {}


def limpiar_viejas():
    """Borra paquetes que nadie leyó en 10 minutos."""
    try: refs = gh("/git/matching-refs/heads/llave-")
    except Exception: return
    for r in refs:
        try:
            fecha = gh("/git/commits/" + r["object"]["sha"])["committer"]["date"]
            edad = time.time() - datetime.datetime.strptime(fecha, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
            if edad > 600: gh("/git/refs/" + r["ref"][5:], None, "DELETE")
        except Exception: pass


def main():
    pedido = os.environ.get("PEDIDO", "")
    if not re.fullmatch(r"[a-f0-9]{16,40}", pedido): raise SystemExit("pedido inválido")
    try: pub = serialization.load_der_public_key(base64.b64decode(os.environ.get("LLAVE", ""), validate=True))
    except Exception: raise SystemExit("candado inválido")
    if not isinstance(pub, rsa.RSAPublicKey) or pub.key_size < 2048: raise SystemExit("candado inválido")
    claves = {k: os.environ.get(v, "").strip() for k, v in (("deepseek", "DEEPSEEK_API_KEY"), ("openai", "OPENAI_API_KEY"), ("groq", "GROQ_API_KEY"))}
    claves = {k: v for k, v in claves.items() if v}
    llave = AESGCM.generate_key(256); iv = os.urandom(12)
    cifrado = AESGCM(llave).encrypt(iv, json.dumps(claves).encode(), None)
    envuelta = pub.encrypt(llave, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    paquete = json.dumps({"k": b64(envuelta), "iv": b64(iv), "c": b64(cifrado), "t": int(time.time())})
    del claves, llave
    limpiar_viejas()
    arbol = gh("/git/trees", {"tree": [{"path": "c.json", "mode": "100644", "type": "blob", "content": paquete}]}, "POST")["sha"]
    commit = gh("/git/commits", {"message": "paquete cifrado", "tree": arbol, "parents": []}, "POST")["sha"]
    gh("/git/refs", {"ref": "refs/heads/llave-" + pedido, "sha": commit}, "POST")
    print("paquete cifrado listo")


main()
