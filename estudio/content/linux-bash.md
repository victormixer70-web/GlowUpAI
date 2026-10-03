### Qué vas a aprender
- Moverte por el sistema de ficheros y manejar archivos y carpetas desde la terminal.
- Entender y cambiar **permisos** (`rwx`, octal, `chmod`, `chown`).
- Buscar texto y archivos con `grep` y `find`.
- Encadenar comandos con **tuberías** y **redirecciones**.
- Gestionar procesos, usuarios, espacio en disco y archivos comprimidos.
- Escribir **scripts de Bash**: variables, argumentos, condiciones, bucles y funciones.

---

### 1. La terminal: lo básico

La **shell** (en Linux, normalmente **Bash**) es el programa que lee lo que escribes y lo ejecuta. El **prompt** te indica quién eres, en qué máquina estás y en qué directorio:

```bash
ana@portatil:~/apuntes$
```

`ana` es el usuario, `portatil` la máquina, `~/apuntes` el directorio actual y `$` indica usuario normal (`#` sería **root**, el administrador).

**Estructura de un comando:** `comando -opciones argumentos`

```bash
ls -l -a /home     # comando ls, opciones -l y -a, argumento /home
ls -la /home       # las opciones cortas se pueden juntar
ls --all /home     # opción larga (con dos guiones)
```

**Rutas:**

| Ruta | Significado |
|---|---|
| `/` | Raíz del sistema de ficheros |
| `~` | Tu directorio personal (`/home/ana`) |
| `.` | El directorio actual |
| `..` | El directorio padre |
| `/etc/hosts` | Ruta **absoluta**: empieza por `/` |
| `docs/tema1.txt` | Ruta **relativa**: parte del directorio actual |

**Trucos que ahorran tiempo:**
- **Tab**: autocompleta nombres de comandos y archivos (pulsa dos veces para ver opciones).
- **↑ / ↓**: recorre los comandos anteriores. `history` los lista todos.
- **Ctrl+R**: busca en el historial. **Ctrl+C**: corta el comando en curso. **Ctrl+L** o `clear`: limpia la pantalla.
- **Ayuda:** `man ls` (manual completo, sal con `q`), `ls --help` (resumen).

---

### 2. Moverse por el sistema de ficheros

| Comando | Qué hace |
|---|---|
| `pwd` | Muestra el directorio actual (*print working directory*) |
| `ls` | Lista el contenido del directorio |
| `ls -l` | Formato largo: permisos, dueño, tamaño, fecha |
| `ls -a` | Incluye los archivos **ocultos** (los que empiezan por `.`) |
| `ls -lh` | Tamaños legibles (K, M, G) |
| `ls -lt` | Ordena por fecha de modificación |
| `ls -R` | Lista recursivamente las subcarpetas |
| `cd carpeta` | Entra en `carpeta` |
| `cd ..` | Sube al directorio padre |
| `cd` o `cd ~` | Va a tu directorio personal |
| `cd -` | Vuelve al directorio anterior |
| `cd /` | Va a la raíz |

**Directorios importantes de Linux:**

| Directorio | Contiene |
|---|---|
| `/home` | Las carpetas personales de los usuarios |
| `/root` | La carpeta personal del administrador |
| `/etc` | Archivos de configuración del sistema |
| `/bin`, `/usr/bin` | Programas (comandos) |
| `/var` | Datos que cambian: registros (`/var/log`), colas… |
| `/tmp` | Archivos temporales (se borran al reiniciar) |
| `/dev` | Dispositivos (discos, terminales…) |
| `/proc` | Información del sistema y de los procesos en ejecución |

---

### 3. Crear, copiar, mover y borrar

```bash
touch notas.txt              # crea un archivo vacío (o actualiza su fecha)
mkdir proyectos              # crea un directorio
mkdir -p a/b/c               # crea toda la ruta, incluidos los padres
cp origen.txt destino.txt    # copia un archivo
cp informe.txt backup/       # copia dentro de otra carpeta
cp -r fotos copia_fotos      # copia una carpeta entera (-r = recursivo)
mv viejo.txt nuevo.txt       # renombra
mv informe.txt docs/         # mueve a otra carpeta
rm temp.log                  # borra un archivo
rm -r build                  # borra una carpeta y todo su contenido
rm -i *.txt                  # pregunta antes de borrar cada archivo
rmdir vacia                  # borra un directorio, solo si está vacío
ln -s /ruta/real enlace      # crea un enlace simbólico (acceso directo)
```

> **Cuidado:** en la terminal **no hay papelera**. `rm -rf` borra sin preguntar y sin vuelta atrás. Revisa siempre la ruta antes de pulsar Enter.

---

### 4. Ver el contenido de los archivos

| Comando | Qué hace |
|---|---|
| `cat archivo` | Muestra el archivo entero |
| `less archivo` | Lo muestra página a página (`espacio` avanza, `/texto` busca, `q` sale) |
| `head archivo` | Las 10 primeras líneas (`head -n 5` para 5) |
| `tail archivo` | Las 10 últimas líneas (`tail -n 20` para 20) |
| `tail -f app.log` | Sigue el archivo en directo (ideal para registros) |
| `wc -l archivo` | Cuenta líneas (`-w` palabras, `-c` bytes) |
| `file archivo` | Dice qué tipo de archivo es |
| `nano archivo` | Editor sencillo (`Ctrl+O` guarda, `Ctrl+X` sale) |
| `vim archivo` | Editor potente (`i` para escribir, `Esc` y luego `:wq` guarda y sale, `:q!` sale sin guardar) |

---

### 5. Comodines (*globbing*)

La shell sustituye estos patrones por los nombres de archivo que encajan **antes** de ejecutar el comando:

| Patrón | Encaja con | Ejemplo |
|---|---|---|
| `*` | Cualquier cosa (incluso nada) | `ls *.txt` → todos los `.txt` |
| `?` | Exactamente un carácter | `ls tema?.pdf` → `tema1.pdf`, `tema2.pdf` |
| `[abc]` | Uno de esos caracteres | `ls [ab]*` → empiezan por `a` o `b` |
| `[0-9]` | Un carácter del rango | `ls foto[0-9].jpg` |
| `{a,b}` | Cada alternativa (expansión de llaves) | `mkdir {src,docs,tests}` |

---

### 6. Permisos

Con `ls -l` ves algo así:

```bash
-rwxr-xr-- 1 ana alumnos 2048 oct  3 10:00 script.sh
```

- El primer carácter es el **tipo**: `-` archivo, `d` directorio, `l` enlace.
- Luego van tres grupos de tres letras: **dueño** (*u*), **grupo** (*g*) y **otros** (*o*).
- `r` = leer, `w` = escribir, `x` = ejecutar (en un directorio, `x` significa poder entrar en él).

En el ejemplo: el dueño `ana` puede `rwx`, el grupo `alumnos` puede `r-x` y el resto solo `r--`.

**Notación octal:** cada grupo es la suma de `r = 4`, `w = 2`, `x = 1`.

| Octal | Permisos | Octal | Permisos |
|---|---|---|---|
| `7` | `rwx` | `3` | `-wx` |
| `6` | `rw-` | `2` | `-w-` |
| `5` | `r-x` | `1` | `--x` |
| `4` | `r--` | `0` | `---` |

**Ejemplo resuelto:** `rwxr-xr--` → dueño `rwx` = 4+2+1 = **7**, grupo `r-x` = 4+0+1 = **5**, otros `r--` = **4** → `754`.

**Permisos típicos:** `755` para scripts y programas, `644` para archivos normales, `600` para archivos privados (claves), `700` para carpetas privadas.

```bash
chmod 755 script.sh        # en octal
chmod u+x script.sh        # añade ejecución al dueño
chmod go-w datos.txt       # quita escritura a grupo y otros
chmod a+r informe.pdf      # todos pueden leer (a = all)
chmod -R 755 web/          # recursivo, a toda la carpeta
chown ana archivo          # cambia el dueño (suele requerir sudo)
chown ana:alumnos archivo  # cambia dueño y grupo
chgrp alumnos archivo      # cambia solo el grupo
sudo comando               # ejecuta un comando como administrador
```

---

### 7. Buscar texto y archivos

**`grep`** busca texto dentro de archivos:

```bash
grep error app.log            # líneas que contienen "error"
grep -i error app.log         # sin distinguir mayúsculas
grep -n error app.log         # muestra el número de línea
grep -c error app.log         # cuenta las líneas que coinciden
grep -v error app.log         # líneas que NO contienen "error"
grep -w main *.c              # solo la palabra completa "main"
grep -r TODO src/             # busca en todos los archivos de src (recursivo)
grep -E "error|fallo" app.log # expresiones regulares extendidas (o lógico)
```

**`find`** busca archivos por nombre, tipo, tamaño o fecha:

```bash
find . -name "*.txt"              # .txt desde aquí hacia abajo (¡con comillas!)
find . -iname "*.jpg"             # igual, sin distinguir mayúsculas
find . -type d -name node_modules # solo directorios
find /var/log -size +10M          # archivos de más de 10 MB
find . -mtime -1                  # modificados en las últimas 24 h
find . -name "*.tmp" -delete      # busca y borra
find . -name "*.sh" -exec chmod +x {} \;   # ejecuta un comando por cada resultado
```

**Otros:** `which python3` dice dónde está un programa; `whereis` y `locate` también localizan archivos.

---

### 8. Redirecciones y tuberías

Todo programa tiene tres canales: **entrada estándar** (0, *stdin*), **salida estándar** (1, *stdout*) y **salida de errores** (2, *stderr*).

| Operador | Qué hace | Ejemplo |
|---|---|---|
| `>` | Envía la salida a un archivo (**sobrescribe**) | `ls > lista.txt` |
| `>>` | Añade la salida al final del archivo | `echo hola >> log.txt` |
| `<` | Usa un archivo como entrada | `sort < nombres.txt` |
| `2>` | Envía los errores a un archivo | `./compilar.sh 2> errores.txt` |
| `2>&1` | Manda los errores al mismo sitio que la salida | `make > todo.log 2>&1` |
| `&>` | Salida y errores al mismo archivo (Bash) | `make &> todo.log` |
| `> /dev/null` | Descarta la salida | `comando > /dev/null 2>&1` |
| `\|` | **Tubería**: la salida de uno es la entrada del siguiente | `ls \| wc -l` |
| `tee` | Muestra y guarda a la vez | `ls \| tee lista.txt` |

**Ejemplos encadenados:**

```bash
ls | wc -l                         # cuántos archivos hay
cat nombres.txt | sort | uniq      # ordena y quita duplicados
grep error app.log | wc -l         # cuántas líneas tienen "error"
history | grep ssh                 # qué comandos ssh he usado
ps aux | grep python               # procesos de python
du -sh * | sort -h | tail -5       # las 5 cosas que más ocupan
```

---

### 9. Procesar texto

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `sort` | Ordena líneas (`-n` numérico, `-r` inverso, `-u` sin repetidos) | `sort -n numeros.txt` |
| `uniq` | Quita líneas repetidas **consecutivas** (`-c` cuenta) | `sort votos.txt \| uniq -c` |
| `cut` | Extrae columnas | `cut -d ',' -f 2 datos.csv` |
| `tr` | Cambia caracteres | `tr 'a-z' 'A-Z' < texto.txt` |
| `sed` | Busca y sustituye | `sed 's/viejo/nuevo/g' archivo` |
| `awk` | Procesa por columnas | `awk '{print $1}' archivo` |
| `diff` | Compara dos archivos | `diff v1.txt v2.txt` |

> `uniq` solo detecta repeticiones **seguidas**: por eso casi siempre se usa después de `sort`.

---

### 10. Procesos

Un **proceso** es un programa en ejecución, y cada uno tiene un número identificador, el **PID**.

```bash
ps                  # procesos de esta terminal
ps aux              # todos los procesos del sistema
top                 # procesos en tiempo real (q para salir); htop es más cómodo
pgrep -a python     # busca procesos por nombre
kill 4242           # pide al proceso 4242 que termine (señal TERM, 15)
kill -9 4242        # lo mata a la fuerza (señal KILL, 9): úsalo como último recurso
killall firefox     # termina todos los procesos con ese nombre
./servidor.sh &     # ejecuta en segundo plano
jobs                # trabajos de esta terminal
fg %1               # trae el trabajo 1 al primer plano
bg %1               # lo reanuda en segundo plano
nohup ./largo.sh &  # sigue ejecutándose aunque cierres la terminal
```

**Ctrl+C** termina el proceso en primer plano. **Ctrl+Z** lo suspende (luego puedes reanudarlo con `fg` o `bg`).

---

### 11. Usuarios y sistema

| Comando | Qué hace |
|---|---|
| `whoami` | Tu nombre de usuario |
| `id`, `groups` | Tus identificadores y grupos |
| `sudo comando` | Ejecuta como administrador |
| `su - usuario` | Cambia de usuario |
| `passwd` | Cambia tu contraseña |
| `df -h` | Espacio libre en los discos |
| `du -sh carpeta` | Cuánto ocupa una carpeta |
| `free -h` | Memoria RAM usada y libre |
| `uname -a` | Información del sistema y del núcleo |
| `uptime` | Tiempo encendido y carga del sistema |
| `date` | Fecha y hora |

---

### 12. Comprimir y archivar

```bash
tar -czf proyecto.tar.gz proyecto/   # crea (c) un .tar.gz comprimido (z) en el archivo (f)
tar -xzf proyecto.tar.gz             # extrae (x)
tar -tzf proyecto.tar.gz             # lista el contenido sin extraer (t)
tar -xzf copia.tar.gz -C destino/    # extrae en otra carpeta
gzip archivo / gunzip archivo.gz     # comprime / descomprime un solo archivo
zip -r fotos.zip fotos/              # crea un .zip
unzip fotos.zip                      # lo descomprime
```

Truco para recordar `tar`: **c**rear, e**x**traer, lis**t**ar; **z** = gzip; **v** = muestra lo que hace; **f** = el archivo va a continuación.

---

### 13. Red, paquetes y entorno

```bash
ping google.com                 # ¿hay conexión? (Ctrl+C para parar)
curl https://ejemplo.com        # descarga y muestra una página
wget https://ejemplo.com/a.zip  # descarga un archivo
ssh ana@servidor                # conexión remota
scp archivo ana@servidor:~/     # copia un archivo a otra máquina

sudo apt update                 # actualiza la lista de paquetes (Debian/Ubuntu)
sudo apt install htop           # instala un programa

echo $PATH                      # carpetas donde la shell busca los programas
export EDITOR=nano              # crea una variable de entorno
alias ll='ls -la'               # atajo (ponlo en ~/.bashrc para que dure)
source ~/.bashrc                # recarga la configuración
```

---

### 14. Scripts de Bash

Un **script** es un archivo de texto con comandos que se ejecutan en orden.

**Crear y ejecutar:**

```bash
#!/bin/bash
# Mi primer script: hola.sh
echo "Hola, $USER"
```

```bash
chmod +x hola.sh   # darle permiso de ejecución
./hola.sh          # ejecutarlo (./ porque no está en el PATH)
bash hola.sh       # o pasárselo a bash directamente
```

La primera línea, `#!/bin/bash`, es el **shebang**: indica qué intérprete ejecuta el script.

#### Variables

```bash
nombre="Ana"           # SIN espacios alrededor del =
edad=19
echo "Hola, $nombre"   # Hola, Ana
echo "Hola, ${nombre}!"
hoy=$(date +%F)        # guarda la salida de un comando
echo 'Hola, $nombre'   # comillas simples: NO se sustituye → Hola, $nombre
```

> `nombre = "Ana"` (con espacios) es un **error**: Bash intenta ejecutar un comando llamado `nombre`.

**Comillas:** las **dobles** sustituyen variables y comandos; las **simples** lo dejan todo literal. Pon siempre las variables entre comillas dobles (`"$archivo"`) para que funcionen con espacios.

#### Argumentos y variables especiales

| Variable | Significado |
|---|---|
| `$0` | Nombre del script |
| `$1`, `$2`… | Primer, segundo… argumento |
| `$#` | Número de argumentos |
| `$@` | Todos los argumentos (uno por uno) |
| `$?` | Código de salida del último comando (`0` = éxito) |
| `$$` | PID del script |

```bash
./saluda.sh Ana Luis    # $1 = Ana, $2 = Luis, $# = 2
read -p "¿Cómo te llamas? " nombre   # pide un dato al usuario
```

#### Aritmética

```bash
a=7; b=3
echo $((a + b))   # 10
echo $((a / b))   # 2  (división entera)
echo $((a % b))   # 1  (resto)
((a++))           # incrementa a
```

#### Condicionales

```bash
if [ "$edad" -ge 18 ]; then
  echo "Mayor de edad"
elif [ "$edad" -ge 16 ]; then
  echo "Casi"
else
  echo "Menor de edad"
fi
```

> Dentro de `[ ]` son **obligatorios los espacios**: `[ "$a" -gt 5 ]`. `[$a -gt 5]` falla.

| Comparar números | | Comparar textos | | Comprobar archivos | |
|---|---|---|---|---|---|
| `-eq` | igual | `=` | igual | `-e` | existe |
| `-ne` | distinto | `!=` | distinto | `-f` | es un archivo |
| `-lt` | menor | `-z` | vacío | `-d` | es un directorio |
| `-le` | menor o igual | `-n` | no vacío | `-r` / `-w` / `-x` | se puede leer / escribir / ejecutar |
| `-gt` | mayor | | | | |
| `-ge` | mayor o igual | | | | |

`[[ ]]` es la versión mejorada de Bash (admite `&&`, `||` y patrones). Atajos en una línea:

```bash
cd build && make           # make solo si cd ha funcionado
mkdir datos || echo "Falló" # el echo solo si mkdir ha fallado
```

**`case`**, para muchas opciones:

```bash
case "$1" in
  start) echo "Arrancando" ;;
  stop)  echo "Parando" ;;
  *)     echo "Uso: $0 start|stop" ;;
esac
```

#### Bucles

```bash
for i in 1 2 3 4 5; do echo "$i"; done
for i in {1..5}; do echo "$i"; done
for ((i = 0; i < 5; i++)); do echo "$i"; done   # estilo C
for f in *.txt; do echo "Archivo: $f"; done      # recorre archivos

n=1
while [ "$n" -le 3 ]; do
  echo "$n"
  ((n++))
done

while read -r linea; do      # lee un archivo línea a línea
  echo "> $linea"
done < datos.txt
```

#### Funciones

```bash
saluda() {
  local nombre="$1"          # local: solo existe dentro de la función
  echo "Hola, $nombre"
}
saluda "Ana"                 # Hola, Ana

es_par() {
  (( $1 % 2 == 0 ))          # el código de salida (return) indica éxito o fallo
}
if es_par 4; then echo "par"; fi
```

`return` devuelve un **código de salida** (0–255), no un valor: para "devolver" datos se usa `echo` y se recoge con `$(...)`.

#### Ejemplo completo comentado

```bash
#!/bin/bash
# backup.sh — copia una carpeta en un .tar.gz con la fecha
# Uso: ./backup.sh carpeta

if [ $# -ne 1 ]; then                 # ¿nos han pasado exactamente 1 argumento?
  echo "Uso: $0 carpeta" >&2          # mensaje de error por stderr
  exit 1                              # código de salida distinto de 0 = error
fi

origen="$1"
if [ ! -d "$origen" ]; then           # ¿existe y es un directorio?
  echo "Error: $origen no es un directorio" >&2
  exit 1
fi

destino="backup_$(date +%F).tar.gz"   # p. ej. backup_2026-10-03.tar.gz
tar -czf "$destino" "$origen" && echo "Copia creada: $destino"
```

---

### Errores típicos

- Poner espacios en una asignación: `x = 5` (mal) → `x=5` (bien).
- Olvidar los espacios dentro de los corchetes: `[$x -gt 5]` (mal) → `[ "$x" -gt 5 ]` (bien).
- Comparar números con `>` dentro de `[ ]`: ahí `>` es una **redirección** y crea un archivo. Usa `-gt`.
- Usar `>` cuando querías `>>` y **sobrescribir** un archivo.
- Olvidar `./` para ejecutar un script del directorio actual, o darle permiso de ejecución con `chmod +x`.
- No poner comillas en `find . -name *.txt`: la shell expande el `*` antes de tiempo. Escribe `"*.txt"`.
- Usar `uniq` sin `sort` antes.
- Confundir `rm -r` (carpeta entera) con `rmdir` (solo carpetas vacías).

---

### Chuleta

| Necesito… | Comando |
|---|---|
| Saber dónde estoy | `pwd` |
| Ver todo, ocultos incluidos, con detalles | `ls -la` |
| Crear una ruta de carpetas | `mkdir -p a/b/c` |
| Copiar / borrar una carpeta | `cp -r` / `rm -r` |
| Ver el final de un log en directo | `tail -f archivo` |
| Hacer ejecutable un script | `chmod +x script.sh` |
| Permisos de script / archivo normal / privado | `755` / `644` / `600` |
| Buscar texto en una carpeta | `grep -rn "texto" carpeta/` |
| Buscar archivos por nombre | `find . -name "*.ext"` |
| Contar líneas | `wc -l archivo` |
| Guardar / añadir la salida | `>` / `>>` |
| Encadenar comandos | `cmd1 \| cmd2` |
| Ver / matar procesos | `ps aux`, `top` / `kill PID` |
| Espacio en disco / tamaño de carpeta | `df -h` / `du -sh carpeta` |
| Comprimir / extraer | `tar -czf x.tar.gz carpeta` / `tar -xzf x.tar.gz` |

---

### Ejercicios resueltos

**1. Cuenta cuántos archivos `.c` hay en la carpeta actual y sus subcarpetas.**

```bash
find . -name "*.c" | wc -l
```

`find` lista una ruta por línea y `wc -l` las cuenta.

**2. Muestra los 3 usuarios del sistema que aparecen primero en `/etc/passwd`, solo su nombre.**

```bash
head -3 /etc/passwd | cut -d ':' -f 1
```

Cada línea de `/etc/passwd` tiene campos separados por `:` y el primero es el nombre.

**3. Un archivo tiene permisos `rw-r-----`. ¿Cuál es su valor octal y qué comando lo deja así?**

`rw-` = 6, `r--` = 4, `---` = 0 → **640**. Comando: `chmod 640 archivo`.

**4. Script que reciba un número y diga si es par o impar.**

```bash
#!/bin/bash
if (( $1 % 2 == 0 )); then
  echo "$1 es par"
else
  echo "$1 es impar"
fi
```

**5. Guarda en `errores.txt` solo las líneas de `app.log` que contengan "ERROR", ordenadas y sin repetir.**

```bash
grep "ERROR" app.log | sort | uniq > errores.txt
```
