# ARENA MIX en Unity

Proyecto de Unity 6 (URP) del juego. La versión web sigue en `arenamix/`.

## Primera vez (y cada vez que haya cambios grandes)
1. En GitHub Desktop: **Fetch origin** y después **Pull origin**.
2. Abre el proyecto `unity/ArenaMix` con Unity Hub.
3. En la barra de menús de Unity: **ArenaMix → Preparar proyecto (crear escena del partido)**.
4. Pulsa **Play** (el triángulo de arriba).

## Controles
- **Móvil:** joystick en la mitad izquierda; botones CHUT (mantén para más fuerza), SPRINT y REGATE/ENTRADA.
- **Teclado:** WASD o flechas para moverte, Espacio para chutar (mantén), Shift para esprintar, E para regate o entrada, Q para pasar (modos 2 vs 2 a 4 vs 4).

## Qué hay
- `Assets/ArenaMix/Scripts`: el juego (balón, jugadores, portero, rival, partido, cámara, controles).
- `Assets/ArenaMix/Editor`: el importador y el menú «Preparar proyecto».
- `Assets/ArenaMix/Characters`, `Animations`, `Environment`: personajes y animaciones de Mixamo, césped, cielo y balón.
- `Assets/ArenaMix/Generated`: lo crea el menú (controlador de animaciones, materiales y la escena `Partido`).
