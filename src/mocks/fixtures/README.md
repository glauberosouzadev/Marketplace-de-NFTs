# Fixtures do banco simulado

Dados 100% fictícios. Senhas nunca ficam em claro no código nem no `localStorage`: só hash PBKDF2-SHA256 + salt.

| Usuário                         | E-mail           | Senha de teste (fictícia) |
| ------------------------------- | ---------------- | ------------------------- |
| Ana Colecionadora (2 carteiras) | ana@kurio.test   | `Kurio@2026`              |
| Bruno Criador (1 carteira)      | bruno@kurio.test | `Colecao#2026`            |

Cupons: `KURIO10` (válido, 10%), `EXPIRADO20` (expirado), `PAUSADO15` (inválido); qualquer outro código também é inválido.
Combinação vazia: coleção "Utilidade" + rede Solana.
