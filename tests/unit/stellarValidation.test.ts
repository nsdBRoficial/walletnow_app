import { describe, it, expect } from 'vitest';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import {
  isValidPublicKey,
  isValidSecretKey,
  STELLAR_ED25519_KEY_LENGTH,
} from '../../src/utils/stellarValidation';

/**
 * ============================================================================
 * WalletNow Ecosystem Testing Personas — Matriz de Testes Unitários de Validação
 * ============================================================================
 * Alvo: Validador de PublicKey e SecretKey Stellar (`isValidPublicKey`, `isValidSecretKey`)
 * Personas Cobertas:
 *   - [B2B] Desenvolvedor Integrador (SDK DX, Contratos de API, Tipagem Forte)
 *   - [B2C] Usuário Final Leigo (Segurança de Chaves, Erros de Digitação, Espaços)
 *   - [REL] Administrador de Infraestrutura (Relayer, Pré-Validação de Fila)
 *   - [SEC] Agente Malicioso / SecOps (Fuzzing, Injeção, Tampering de Checksum)
 * ============================================================================
 */

describe('Stellar Address Validation — Persona Testing Matrix', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Persona 1: Desenvolvedor Integrador (B2B)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Persona 1: Desenvolvedor Integrador (B2B) — DX e Contratos de API', () => {
    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [B2B-VAL-01] Validação de Chave Pública Canônica Ed25519 gerada pelo SDK |
     * | Persona | Desenvolvedor Integrador (B2B) |
     * | Pré-condição | SDK inicializado e Keypair canônico gerado via `@stellar/stellar-sdk` |
     * | Passo a Passo | 1. Gerar novo par de chaves canônico. 2. Passar a chave pública para `isValidPublicKey`. |
     * | Resultado Esperado | Retorna `true` estritamente, confirmando tipo `key is string`. |
     * | Caso Extremo | Múltiplas gerações aleatórias em loop para cobrir variações de entropia. |
     */
    it('[B2B-VAL-01] deve validar chaves públicas Ed25519 legítimas geradas pelo SDK', () => {
      for (let i = 0; i < 5; i++) {
        const keypair = Keypair.random();
        const publicKey = keypair.publicKey();

        expect(publicKey.length).toBe(STELLAR_ED25519_KEY_LENGTH);
        expect(publicKey.startsWith('G')).toBe(true);
        expect(isValidPublicKey(publicKey)).toBe(true);
      }
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [B2B-VAL-02] Validação de Chaves Públicas Notórias da Mainnet Stellar |
     * | Persona | Desenvolvedor Integrador (B2B) |
     * | Pré-condição | Lista de chaves públicas conhecidas e em circulação na rede Stellar |
     * | Passo a Passo | 1. Validar endereço da Fundação de Desenvolvimento Stellar (SDF) e contas bem conhecidas. |
     * | Resultado Esperado | Retorna `true` para todas as contas válidas da rede. |
     * | Caso Extremo | Chaves de diferentes períodos de geração e redes públicas. |
     */
    it('[B2B-VAL-02] deve validar chaves públicas históricas e notórias da rede Stellar', () => {
      // Chaves públicas canônicas das redes Stellar (Public Network e Testnet Master)
      const wellKnownAddresses = [
        'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7', // Stellar Public Genesis Master
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H', // Stellar Testnet Genesis Master
        'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', // Stellar Operations
      ];

      for (const addr of wellKnownAddresses) {
        expect(addr.length).toBe(STELLAR_ED25519_KEY_LENGTH);
        expect(isValidPublicKey(addr)).toBe(true);
      }
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [B2B-VAL-03] Rejeição de Contratos Soroban ('C...') e Contas Muxed ('M...') |
     * | Persona | Desenvolvedor Integrador (B2B) |
     * | Pré-condição | Desenvolvedor passa erroneamente um Contract ID ou Muxed Account onde se espera PublicKey de conta |
     * | Passo a Passo | 1. Fornecer ID de Contrato Soroban ('C...'). 2. Fornecer Conta Muxed ('M...'). 3. Validar com `isValidPublicKey`. |
     * | Resultado Esperado | Retorna `false` para ambos, pois `isValidPublicKey` valida estritamente contas Ed25519 ('G...'). |
     * | Caso Extremo | Strings com 56 caracteres iniciando com 'C' ou 69 caracteres iniciando com 'M'. |
     */
    it('[B2B-VAL-03] deve rejeitar endereços de contratos Soroban (C...) e contas Muxed (M...)', () => {
      // Exemplo de endereço de contrato Soroban (inicia com C)
      const sorobanContractId = 'CA3D5KRYMCMCZKPO7SC6AAIQCZ5DT7S3DHQMIFMVZT2HX2MGEMGNLBKN';
      expect(sorobanContractId.startsWith('C')).toBe(true);
      expect(isValidPublicKey(sorobanContractId)).toBe(false);

      // Exemplo de conta Muxed (inicia com M)
      const muxedAccount = 'MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK';
      expect(muxedAccount.startsWith('M')).toBe(true);
      expect(isValidPublicKey(muxedAccount)).toBe(false);
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [B2B-VAL-04] Resiliência a Tipos Incorretos em Runtime (Type Narrowing) |
     * | Persona | Desenvolvedor Integrador (B2B) |
     * | Pré-condição | Aplicação consumidora em JavaScript puro ou com casting imperfeito passa tipos não-string |
     * | Passo a Passo | 1. Invocar `isValidPublicKey` com `null`, `undefined`, números, objetos, booleanos, arrays. |
     * | Resultado Esperado | Retorna `false` graciosamente sem lançar TypeError. |
     * | Caso Extremo | Objetos sem prototype ou funções passadas como argumento. |
     */
    it('[B2B-VAL-04] deve lidar graciosamente com tipos incorretos em tempo de execução sem crashar', () => {
      expect(isValidPublicKey(null)).toBe(false);
      expect(isValidPublicKey(undefined)).toBe(false);
      expect(isValidPublicKey(123456789)).toBe(false);
      expect(isValidPublicKey(true)).toBe(false);
      expect(isValidPublicKey({})).toBe(false);
      expect(isValidPublicKey([])).toBe(false);
      expect(isValidPublicKey(() => 'GAAZ')).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Persona 2: Usuário Final Leigo (B2C)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Persona 2: Usuário Final Leigo (B2C) — Prevenção de Erros Humanos e Vazamentos', () => {
    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [B2C-VAL-01] Bloqueio Imediato de Chave Secreta/Seed ('S...') |
     * | Persona | Usuário Final Leigo (B2C) |
     * | Pré-condição | Usuário cola acidentalmente sua chave privada/seed no campo de endereço de destino |
     * | Passo a Passo | 1. Gerar SecretKey legítima ('S...'). 2. Submeter a `isValidPublicKey`. |
     * | Resultado Esperado | Retorna `false` imediatamente, impedindo vazamento de chave privada em transação pública. |
     * | Caso Extremo | Chave secreta de 56 caracteres com checksum matematicamente válido para seed. |
     */
    it('[B2C-VAL-01] deve rejeitar imediatamente chaves secretas (iniciadas em S) para prevenir vazamento', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();

      expect(secretKey.startsWith('S')).toBe(true);
      expect(secretKey.length).toBe(STELLAR_ED25519_KEY_LENGTH);
      // Confirma que é uma seed válida
      expect(isValidSecretKey(secretKey)).toBe(true);
      // E garante que NÃO é aceita como chave pública
      expect(isValidPublicKey(secretKey)).toBe(false);
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [B2C-VAL-02] Rejeição de Strings Vazias e com Espaços Acidentais |
     * | Persona | Usuário Final Leigo (B2C) |
     * | Pré-condição | Usuário submete campo em branco ou insere espaços ao copiar e colar |
     * | Passo a Passo | 1. Testar string vazia. 2. Testar string com espaços no início ou fim. 3. Testar apenas espaços. |
     * | Resultado Esperado | Retorna `false` para todos os cenários sem crash. |
     * | Caso Extremo | Chave válida cercada por quebras de linha (`\n`) ou tabs (`\t`). |
     */
    it('[B2C-VAL-02] deve rejeitar strings vazias e com espaços em branco acidentais', () => {
      const validKey = Keypair.random().publicKey();

      expect(isValidPublicKey('')).toBe(false);
      expect(isValidPublicKey('   ')).toBe(false);
      expect(isValidPublicKey(` ${validKey}`)).toBe(false);
      expect(isValidPublicKey(`${validKey} `)).toBe(false);
      expect(isValidPublicKey(`\n${validKey}\n`)).toBe(false);
      expect(isValidPublicKey(`\t${validKey}`)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Persona 3: Administrador de Infraestrutura (Relayer)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Persona 3: Administrador de Infraestrutura (Relayer) — Pré-Validação de Fila', () => {
    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [REL-VAL-01] Pré-filtro Estrito de Contas Patrocinadas e Contas Pagadoras |
     * | Persona | Administrador de Infraestrutura (Relayer) |
     * | Pré-condição | O Relayer recebe payloads de transação para despachar e precisa validar o `sourceAccount` e patrocinados |
     * | Passo a Passo | 1. Validar contas válidas do pool do relayer. 2. Tentar passar conta truncada ou alterada. |
     * | Resultado Esperado | Contas íntegras retornam `true`; qualquer mutação retorna `false`, evitando falhas de RPC na rede. |
     * | Caso Extremo | Sequência concorrente de validações de 100 chaves. |
     */
    it('[REL-VAL-01] deve filtrar com precisão e consistência contas sob carga repetitiva', () => {
      const keypairs = Array.from({ length: 50 }, () => Keypair.random());

      for (const kp of keypairs) {
        const pub = kp.publicKey();
        expect(isValidPublicKey(pub)).toBe(true);

        // Altera o último caractere (corrompe checksum)
        const tampered = pub.slice(0, 55) + (pub[55] === 'A' ? 'B' : 'A');
        expect(isValidPublicKey(tampered)).toBe(false);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Persona 4: Agente Malicioso / SecOps
  // ──────────────────────────────────────────────────────────────────────────
  describe('Persona 4: Agente Malicioso / SecOps — Fuzzing, Injeção e Tampering', () => {
    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [SEC-VAL-01] Rejeição de Chaves com Tamanho Incorreto (Truncadas ou Overflow) |
     * | Persona | Agente Malicioso / SecOps |
     * | Pré-condição | Payload com tamanho manipulado para tentar causar buffer overflow ou bypass de regex |
     * | Passo a Passo | 1. Testar chave com 1 caractere ('G'). 2. Chave com 55 caracteres. 3. Chave com 57 caracteres. 4. Payload longo (> 500 chars). |
     * | Resultado Esperado | Retorna `false` para qualquer chave com tamanho diferente de 56 caracteres. |
     * | Caso Extremo | 56 caracteres menos 1, e 56 caracteres mais 1. |
     */
    it('[SEC-VAL-01] deve rejeitar chaves com tamanho incorreto (menor ou maior que 56 caracteres)', () => {
      const validKey = Keypair.random().publicKey();

      // Menor que 56 caracteres
      expect(isValidPublicKey('G')).toBe(false);
      expect(isValidPublicKey(validKey.slice(0, 30))).toBe(false);
      expect(isValidPublicKey(validKey.slice(0, 55))).toBe(false); // 55 caracteres

      // Maior que 56 caracteres
      expect(isValidPublicKey(validKey + 'A')).toBe(false); // 57 caracteres
      expect(isValidPublicKey(validKey + validKey)).toBe(false); // 112 caracteres
      expect(isValidPublicKey('G' + 'A'.repeat(1000))).toBe(false); // Payload de saturação
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [SEC-VAL-02] Rejeição de Injeção de Caracteres Especiais e Payloads Maliciosos |
     * | Persona | Agente Malicioso / SecOps |
     * | Pré-condição | Tentativa de injeção de scripts (XSS), SQLi ou quebras de controle |
     * | Passo a Passo | 1. Testar payloads como `<script>`, `G" OR 1=1`, caracteres unicode, emojis, pontuação. |
     * | Resultado Esperado | Retorna `false` sem executar ou vazar nenhuma exceção interna. |
     * | Caso Extremo | Chave de 56 caracteres preenchida com caracteres especiais (`G` seguido de `!@#$%...`). |
     */
    it('[SEC-VAL-02] deve rejeitar injeções de caracteres especiais, emojis e payloads de invasão', () => {
      expect(isValidPublicKey('<script>alert(1)</script>')).toBe(false);
      expect(isValidPublicKey("G' OR '1'='1' --")).toBe(false);
      expect(isValidPublicKey('G🚀' + 'A'.repeat(53))).toBe(false);
      expect(isValidPublicKey('G' + '!@#$%^&*()_+-=[]{}|;:",.<>?/~`'.repeat(2).slice(0, 55))).toBe(false);
      expect(isValidPublicKey('G\u0000\u0001\u0002' + 'A'.repeat(52))).toBe(false);
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [SEC-VAL-03] Rejeição de Chaves Forjadas com Checksum CRC16 Corrompido (Tampering) |
     * | Persona | Agente Malicioso / SecOps |
     * | Pré-condição | Atacante forja chave iniciando com 'G' e contendo 56 caracteres válidos no alfabeto Base32, mas com checksum adulterado |
     * | Passo a Passo | 1. Criar string de 56 caracteres iniciada com 'G' usando caracteres válidos de Base32. 2. Passar a `isValidPublicKey`. |
     * | Resultado Esperado | Retorna `false` devido à validação algorítmica do CRC16 pelo StrKey. |
     * | Caso Extremo | Chave repetida 'G' + 'A'*55 e 'G' + 'B'*55. |
     */
    it('[SEC-VAL-03] deve rejeitar chaves com prefixo G e 56 caracteres com checksum CRC16 inválido', () => {
      // 56 caracteres válidos em base32, mas checksum matemático inválido
      const forgedAllA = 'G' + 'A'.repeat(55);
      expect(forgedAllA.length).toBe(56);
      expect(isValidPublicKey(forgedAllA)).toBe(false);

      const forgedAllB = 'G' + 'B'.repeat(55);
      expect(forgedAllB.length).toBe(56);
      expect(isValidPublicKey(forgedAllB)).toBe(false);

      const forgedSequence = 'G' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.repeat(2).slice(0, 55);
      expect(forgedSequence.length).toBe(STELLAR_ED25519_KEY_LENGTH);
      expect(isValidPublicKey(forgedSequence)).toBe(false);
    });

    /**
     * | Campo | Descrição |
     * | :--- | :--- |
     * | ID & Título | [SEC-VAL-04] Rejeição de Caracteres Proibidos da Codificação Base32 Stellar |
     * | Persona | Agente Malicioso / SecOps |
     * | Pré-condição | Stellar usa Base32 RFC 4648 sem padding (alfabeto A-Z, 2-7). Dígitos 0, 1, 8, 9 e letras minúsculas são ilegais |
     * | Passo a Passo | 1. Testar chave válida convertida para minúsculas. 2. Inserir dígitos proibidos ('0', '1', '8', '9') na chave. |
     * | Resultado Esperado | Retorna `false` para todas as violações do alfabeto Base32. |
     * | Caso Extremo | Apenas 1 caractere em minúsculo no meio de uma chave válida. |
     */
    it('[SEC-VAL-04] deve rejeitar caracteres proibidos da Base32 Stellar (0, 1, 8, 9 e minúsculas)', () => {
      const validKey = Keypair.random().publicKey();

      // Minúsculas completas
      expect(isValidPublicKey(validKey.toLowerCase())).toBe(false);

      // Minúscula no prefixo ('g')
      expect(isValidPublicKey('g' + validKey.slice(1))).toBe(false);

      // Inserção de caracteres proibidos do Base32 Stellar (0, 1, 8, 9)
      const keyWithZero = 'G' + '0'.repeat(55);
      expect(isValidPublicKey(keyWithZero)).toBe(false);

      const keyWithOne = 'G' + '1'.repeat(55);
      expect(isValidPublicKey(keyWithOne)).toBe(false);

      const keyWithEight = 'G' + '8'.repeat(55);
      expect(isValidPublicKey(keyWithEight)).toBe(false);

      const keyWithNine = 'G' + '9'.repeat(55);
      expect(isValidPublicKey(keyWithNine)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Validação Complementar: isValidSecretKey (Simetria de Integridade)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Validação Complementar: isValidSecretKey (Chaves Secretas Ed25519)', () => {
    it('deve validar chaves secretas legítimas iniciadas com S e 56 caracteres', () => {
      const keypair = Keypair.random();
      const secret = keypair.secret();

      expect(secret.startsWith('S')).toBe(true);
      expect(secret.length).toBe(STELLAR_ED25519_KEY_LENGTH);
      expect(isValidSecretKey(secret)).toBe(true);
    });

    it('deve rejeitar chaves secretas inválidas, nulas, truncadas ou invertidas', () => {
      expect(isValidSecretKey(null)).toBe(false);
      expect(isValidSecretKey(undefined)).toBe(false);
      expect(isValidSecretKey('')).toBe(false);
      expect(isValidSecretKey('S')).toBe(false);
      expect(isValidSecretKey('S' + 'A'.repeat(55))).toBe(false);
      // Chave pública fornecida como secret key deve falhar
      const validPub = Keypair.random().publicKey();
      expect(isValidSecretKey(validPub)).toBe(false);
    });
  });
});
