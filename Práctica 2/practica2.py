# Para instalar dependencias ejecutar en la terminal:
# pip install -r requirements.txt

# -*- coding: utf-8 -*-
# ==========================================
# Autor: Elmer Luis Saint-Hilare Rojo
# Matrícula: 21-1354
# ==========================================

# Marca personal
NOMBRE = "Elmer Luis Saint-Hilare Rojo"
MATRICULA = "21-1354"

# ---- Dependencias de consola ----
try:
    from colorama import Fore, Back, Style, init
    init(autoreset=True)
except ImportError:
    # Fallback mínimo si no está colorama
    class _Dummy:
        def __getattr__(self, _): return ""
    Fore = Back = Style = _Dummy()

import os
import sys

# ---- Utilidades UI ----
def clear():
    os.system("cls" if os.name == "nt" else "clear")

def line(w=60, char="─", color=Fore.BLACK + Style.DIM):
    print(color + char * w + Style.RESET_ALL)

def cabecera():
    title = f"{NOMBRE} | Matrícula: {MATRICULA}"
    w = max(64, len(title) + 6)
    top = "┌" + "─" * (w - 2) + "┐"
    mid = "│" + title.center(w - 2) + "│"
    bot = "└" + "─" * (w - 2) + "┘"
    print(Back.BLUE + " " * w + Style.RESET_ALL)
    print(Back.BLUE + Fore.WHITE + top + Style.RESET_ALL)
    print(Back.BLUE + Fore.WHITE + mid + Style.RESET_ALL)
    print(Back.BLUE + Fore.WHITE + bot + Style.RESET_ALL)
    print(Back.BLUE + " " * w + Style.RESET_ALL + "\n")

def menu():
    print(Fore.CYAN + Style.BRIGHT + "Menú de Ejercicios".upper() + Style.RESET_ALL)
    line()
    items = [
        ("1", "Negatividad de entero", "🔹"),
        ("2", "Conteo de dígitos", "🔹"),
        ("3", "Primo o no primo", "🔹"),
        ("4", "Mayor y posición en lista (4)", "🔹"),
        ("5", "Eliminar duplicados (lista dada)", "🔹"),
        ("0", "Salir", "⏹"),
    ]
    for key, label, icon in items:
        print(f" {Fore.GREEN}{key}{Style.RESET_ALL}  {icon} {label}")
    line()
    print(Fore.YELLOW + "Seleccione una opción y presione Enter." + Style.RESET_ALL)

def input_int(msg: str) -> int:
    while True:
        val = input(Fore.CYAN + msg + Style.RESET_ALL + " ")
        try:
            return int(val)
        except ValueError:
            print(Fore.RED + "Entrada inválida. Ingrese un entero." + Style.RESET_ALL)

# ---- Lógica de ejercicios ----
def es_primo(n: int) -> bool:
    if n <= 1:
        return False
    if n % 2 == 0:
        return n == 2
    i = 3
    limite = int(n ** 0.5) + 1
    while i <= limite:
        if n % i == 0:
            return False
        i += 2
    return True

def ejercicio1():
    n = input_int("Número entero:")
    print(Fore.MAGENTA + (f"{n} es negativo" if n < 0 else f"{n} no es negativo") + Style.RESET_ALL)

def ejercicio2():
    n = input_int("Número entero:")
    print(Fore.MAGENTA + f"{n} tiene {len(str(abs(n)))} dígitos" + Style.RESET_ALL)

def ejercicio3():
    n = input_int("Número entero:")
    print(Fore.MAGENTA + (f"{n} es primo" if es_primo(n) else f"{n} no es primo") + Style.RESET_ALL)

def ejercicio4():
    lista = [input_int(f"Ingrese número {i+1}:") for i in range(4)]
    mayor = max(lista)
    pos = lista.index(mayor)
    print(Fore.BLUE + f"Lista: {lista}" + Style.RESET_ALL)
    print(Fore.MAGENTA + f"Mayor: {mayor}, posición: {pos}" + Style.RESET_ALL)

def ejercicio5():
    numeros = [1,1,2,3,3,2,5,6,2,7,8,4,3,1]
    limpio = list(dict.fromkeys(numeros))  # mantiene orden
    print(Fore.BLUE + f"Original: {numeros}" + Style.RESET_ALL)
    print(Fore.MAGENTA + f"Sin duplicados: {limpio}" + Style.RESET_ALL)

def pausa():
    input(Fore.YELLOW + "\nPresione Enter para continuar..." + Style.RESET_ALL)

# ---- Loop principal ----
def main():
    while True:
        clear()
        cabecera()
        menu()
        op = input(Fore.GREEN + "Opción: " + Style.RESET_ALL).strip()
        clear()
        cabecera()
        if op == "1":
            ejercicio1()
        elif op == "2":
            ejercicio2()
        elif op == "3":
            ejercicio3()
        elif op == "4":
            ejercicio4()
        elif op == "5":
            ejercicio5()
        elif op == "0":
            print(Fore.GREEN + "Gracias por usar el programa." + Style.RESET_ALL)
            break
        else:
            print(Fore.RED + "Opción no válida." + Style.RESET_ALL)
        pausa()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n" + Fore.YELLOW + "Ejecución interrumpida por el usuario." + Style.RESET_ALL)
        sys.exit(0)
