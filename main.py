# Programa básico para mostrar el nombre del creador o saludar al usuario.

# Definimos el creador del programa
creador = "Elmer Saint-Hilare, 21-1354"

# Función para imprimir información según la opción seleccionada
def imprimir_nombre(pregunta):
    if pregunta == 2:
        # Solicita el nombre del usuario y lo saluda
        nombreUsuario = input("Ingresa tu nombre: ")
        print("Saludos,", nombreUsuario)
    elif pregunta == 1:
        # Muestra el nombre del creador del programa
        print("El creador de este programa es:", creador)
    else:
        # Manejo de opción inválida
        print("Opción no válida. Por favor, elige 1 o 2.")

# Bucle principal para ejecutar el programa
while True:
    try:
        # Mostrar menú y solicitar entrada
        pregunta = int(input("\n¿Qué deseas hacer? \n1) Imprimir el nombre del creador\n2) Imprimir tu nombre\n3) Salir\n> "))
        
        if pregunta == 3:
            print("Terminando el programa... ¡Hasta luego!")
            break  # Sale del bucle y termina el programa
        
        # Llamar a la función con la opción seleccionada
        imprimir_nombre(pregunta)
    except ValueError:
        # Manejar entradas no válidas (como texto en lugar de números)
        print("Entrada no válida. Por favor, ingresa un número.")
