import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: const MyHomePage(title: 'Tenis App'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF0E8D7),
      body: Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              ElevatedButton(
                onPressed: () {
                  print("JOGADOR");
                },
                style: ElevatedButton.styleFrom(
                  fixedSize: const Size(200, 100),
                  backgroundColor: Color(0xFFE23D2E),
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.black, width: 2),
                  shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.zero
                  )
                  ),
                child: const Text("JOGADOR"),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: () {
                  print("CAMPEONATO");
                },
                style: ElevatedButton.styleFrom(
                  fixedSize: const Size(200, 100),
                  backgroundColor: Color(0xFFE23D2E),
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.black, width: 2),
                  shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.zero
                  )
                  ),
                child: const Text("CAMPEONATO"),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: () {
                  print("PARTIDA");
                },
                style: ElevatedButton.styleFrom(
                  fixedSize: const Size(200, 100),
                  backgroundColor: Color(0xFFE23D2E),
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.black, width: 2),
                  shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.zero
                  )
                  ),
                child: const Text("PARTIDA"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

