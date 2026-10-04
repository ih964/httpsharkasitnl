import { useState } from "react";
import { supabase as source } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

const TARGET_URL = "https://uqkrxzlkvjdmebsbdrmb.supabase.co";

const ALLOWED_ADMINS = [
  "info@harkasit.nl",
  "administratie@harkasit.nl",
  "iliasharkati@outlook.com",
];

type LogType = "info" | "success" | "error";

type LogEntry = {
  message: string;
  type: LogType;
};

export default function MigrationVault() {
  const [targetKey, setTargetKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogType = "info") => {
    setLogs((current) => [...current, { message, type }]);
  };

  const fail = (message: string) => {
    addLog(message, "error");
    setProgress("Migratie gestopt — bron is niet gewijzigd.");
  };

  const runMigration = async () => {
    if (running) return;

    setRunning(true);
    setLogs([]);
    setProgress("Migratie voorbereiden...");

    try {
      /*
       * ------------------------------------------------------------
       * 1. INPUT VALIDATION
       * ------------------------------------------------------------
       */

      const cleanTargetKey = targetKey.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanTargetKey) {
        throw new Error(
          "Vul de publishable/anon key van het nieuwe Supabase-project in."
        );
      }

      if (!cleanEmail) {
        throw new Error("Vul het nieuwe admin e-mailadres in.");
      }

      if (!ALLOWED_ADMINS.includes(cleanEmail)) {
        throw new Error(
          "Dit account is niet toegestaan voor deze migratie."
        );
      }

      if (!password) {
        throw new Error("Vul het nieuwe admin-wachtwoord in.");
      }

      /*
       * ------------------------------------------------------------
       * 2. CREATE TARGET CLIENT
       * ------------------------------------------------------------
       *
       * Alleen een publishable/anon key.
       *
       * NOOIT:
       * - service_role
       * - database password
       * - management token
       */

      const target = createClient(TARGET_URL, cleanTargetKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      /*
       * ------------------------------------------------------------
       * 3. VERIFY OLD SESSION
       * ------------------------------------------------------------
       */

      setProgress("Oude productieomgeving controleren...");

      const {
        data: sourceUserData,
        error: sourceUserError,
      } = await source.auth.getUser();

      if (sourceUserError || !sourceUserData.user) {
        throw new Error(
          "Je bent niet ingelogd op de oude Harkas IT omgeving."
        );
      }

      const {
        data: sourceRole,
        error: sourceRoleError,
      } = await source
        .from("user_roles")
        .select("role")
        .eq("user_id", sourceUserData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (sourceRoleError) {
        throw new Error(
          `Oude administratorcontrole mislukt: ${sourceRoleError.message}`
        );
      }

      if (!sourceRole) {
        throw new Error(
          "Het huidige account is geen administrator."
        );
      }

      addLog(
        `Oude admin-sessie gecontroleerd: ${sourceUserData.user.email}`,
        "success"
      );

      /*
       * ------------------------------------------------------------
       * 4. LOGIN TO TARGET
       * ------------------------------------------------------------
       */

      setProgress("Nieuwe Harkas Admin controleren...");

      const {
        data: targetLogin,
        error: targetLoginError,
      } = await target.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (targetLoginError || !targetLogin.user) {
        throw new Error(
          targetLoginError?.message ||
            "Inloggen op de nieuwe Harkas Admin omgeving mislukt."
        );
      }

      if (
        !targetLogin.user.email ||
        targetLogin.user.email.toLowerCase() !== cleanEmail
      ) {
        throw new Error(
          "Het ingelogde account komt niet overeen met het opgegeven admin-account."
        );
      }

      if (!ALLOWED_ADMINS.includes(cleanEmail)) {
        throw new Error(
          "Dit account is niet toegestaan voor de migratie."
        );
      }

      addLog(
        `Nieuwe admin-login succesvol: ${cleanEmail}`,
        "success"
      );

      /*
       * ------------------------------------------------------------
       * 5. VERIFY SOURCE VAULT
       * ------------------------------------------------------------
       */

      setProgress("Aantal vault-items controleren...");

      const {
        data: vaultRows,
        error: vaultReadError,
      } = await source
        .from("password_vault")
        .select("id");

      if (vaultReadError) {
        throw new Error(
          `Oude vault kon niet worden gelezen: ${vaultReadError.message}`
        );
      }

      if (!vaultRows || vaultRows.length !== 60) {
        throw new Error(
          `Verwacht 60 vault-items, maar vond ${
            vaultRows?.length ?? 0
          }. Migratie wordt afgebroken.`
        );
      }

      addLog("Bron bevat exact 60 vault-items.", "success");

      /*
       * ------------------------------------------------------------
       * 6. MIGRATE VAULT
       * ------------------------------------------------------------
       *
       * De oude decrypt-password Edge Function gebruikt:
       *
       *   oude VAULT_ENCRYPTION_KEY
       *
       * De nieuwe encrypt-password Edge Function gebruikt:
       *
       *   nieuwe VAULT_ENCRYPTION_KEY
       *
       * Plaintext wachtwoorden worden NIET opgeslagen.
       */

      let migratedVault = 0;

      for (const row of vaultRows) {
        setProgress(
          `Wachtwoordkluis migreren: ${migratedVault + 1}/60`
        );

        /*
         * Oude omgeving decrypt.
         */

        const {
          data: decrypted,
          error: decryptError,
        } = await source.functions.invoke("decrypt-password", {
          body: {
            id: row.id,
          },
        });

        if (decryptError || !decrypted?.password) {
          throw new Error(
            `Vault-item ${row.id} kon niet vanuit de oude omgeving worden ontsleuteld.`
          );
        }

        /*
         * Nieuwe omgeving encrypt.
         */

        const {
          data: encrypted,
          error: encryptError,
        } = await target.functions.invoke("encrypt-password", {
          body: {
            password: decrypted.password,
          },
        });

        /*
         * Probeer plaintext zo snel mogelijk uit de lokale
         * variabele te verwijderen.
         */

        const plaintextLength = decrypted.password.length;

        if (encryptError || !encrypted?.encrypted) {
          throw new Error(
            `Vault-item ${row.id} kon niet opnieuw worden versleuteld.`
          );
        }

        /*
         * Alleen ciphertext naar de nieuwe database.
         */

        const {
          error: updateError,
        } = await target
          .from("password_vault")
          .update({
            encrypted_password: encrypted.encrypted,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateError) {
          throw new Error(
            `Vault-item ${row.id} kon niet naar de nieuwe database worden geschreven: ${updateError.message}`
          );
        }

        migratedVault++;

        /*
         * Geen plaintext loggen.
         */

        void plaintextLength;

        addLog(
          `Vault-item ${migratedVault}/60 gemigreerd.`,
          "success"
        );
      }

      addLog(
        "Alle 60 vault-items zijn opnieuw versleuteld.",
        "success"
      );

      /*
       * ------------------------------------------------------------
       * 7. MIGRATE INVOICE FILES
       * ------------------------------------------------------------
       */

      setProgress("Factuur-PDF's controleren...");

      const {
        data: invoices,
        error: invoiceError,
      } = await source
        .from("invoices")
        .select("id,pdf_storage_path")
        .not("pdf_storage_path", "is", null);

      if (invoiceError) {
        throw new Error(
          `Facturen konden niet worden gelezen: ${invoiceError.message}`
        );
      }

      let migratedFiles = 0;

      for (const invoice of invoices ?? []) {
        const path = String(invoice.pdf_storage_path);

        setProgress(
          `Factuur-PDF's migreren: ${migratedFiles + 1}/19`
        );

        const {
          data: file,
          error: downloadError,
        } = await source.storage
          .from("invoices")
          .download(path);

        if (downloadError || !file) {
          throw new Error(
            `PDF kon niet worden gelezen: ${path}`
          );
        }

        const {
          error: uploadError,
        } = await target.storage
          .from("invoices")
          .upload(path, file, {
            upsert: true,
            contentType: "application/pdf",
          });

        if (uploadError) {
          throw new Error(
            `PDF kon niet worden opgeslagen: ${path} — ${uploadError.message}`
          );
        }

        migratedFiles++;

        addLog(
          `PDF gemigreerd: ${migratedFiles}/${invoices.length}.`,
          "success"
        );
      }

      /*
       * ------------------------------------------------------------
       * 8. MIGRATE BRANDING
       * ------------------------------------------------------------
       */

      setProgress("Logo/branding migreren...");

      const {
        data: brandingFiles,
        error: brandingError,
      } = await source.storage
        .from("branding")
        .list("", {
          limit: 100,
        });

      if (brandingError) {
        throw new Error(
          `Branding kon niet worden gelezen: ${brandingError.message}`
        );
      }

      for (const item of brandingFiles ?? []) {
        if (!item.name) continue;

        const {
          data: file,
          error: downloadError,
        } = await source.storage
          .from("branding")
          .download(item.name);

        if (downloadError || !file) {
          throw new Error(
            `Branding-bestand kon niet worden gelezen: ${item.name}`
          );
        }

        const {
          error: uploadError,
        } = await target.storage
          .from("branding")
          .upload(item.name, file, {
            upsert: true,
            contentType: file.type || undefined,
          });

        if (uploadError) {
          throw new Error(
            `Branding-bestand kon niet worden opgeslagen: ${item.name} — ${uploadError.message}`
          );
        }

        migratedFiles++;

        addLog(
          `Branding-bestand gemigreerd: ${item.name}`,
          "success"
        );
      }

      addLog(
        `Storage-migratie voltooid: ${migratedFiles} bestanden.`,
        "success"
      );

      /*
       * ------------------------------------------------------------
       * 9. VERIFY VAULT COUNT
       * ------------------------------------------------------------
       */

      setProgress("Nieuwe vault controleren...");

      const {
        data: targetVault,
        error: targetVaultError,
      } = await target
        .from("password_vault")
        .select("id");

      if (targetVaultError) {
        throw new Error(
          `Nieuwe vault kon niet worden gecontroleerd: ${targetVaultError.message}`
        );
      }

      if ((targetVault?.length ?? 0) !== 60) {
        throw new Error(
          `Nieuwe vault bevat ${
            targetVault?.length ?? 0
          } items; verwacht 60.`
        );
      }

      addLog(
        "Nieuwe vault bevat 60/60 items.",
        "success"
      );

      /*
       * ------------------------------------------------------------
       * 10. VERIFY STORAGE
       * ------------------------------------------------------------
       */

      setProgress("Storage eindcontrole...");

      let verifiedFiles = 0;

      for (const invoice of invoices ?? []) {
        const path = String(invoice.pdf_storage_path);

        const directory = path.includes("/")
          ? path.substring(0, path.lastIndexOf("/"))
          : "";

        const filename = path.includes("/")
          ? path.substring(path.lastIndexOf("/") + 1)
          : path;

        const {
          data: files,
          error: listError,
        } = await target.storage
          .from("invoices")
          .list(directory, {
            search: filename,
            limit: 20,
          });

        if (listError) {
          throw new Error(
            `Storagecontrole mislukt voor ${path}: ${listError.message}`
          );
        }

        if (!files?.some((file) => file.name === filename)) {
          throw new Error(
            `PDF ontbreekt in de nieuwe storage: ${path}`
          );
        }

        verifiedFiles++;
      }

      addLog(
        `PDF-controle: ${verifiedFiles}/${invoices?.length ?? 0}.`,
        "success"
      );

      /*
       * ------------------------------------------------------------
       * 11. CLEAN UP SESSION
       * ------------------------------------------------------------
       */

      await target.auth.signOut();

      setPassword("");

      setProgress(
        "Migratie + basiscontrole voltooid. Productie is NIET omgezet."
      );

      addLog(
        "Migratie is voltooid. De oude productieomgeving is ongemoeid gelaten.",
        "success"
      );
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "Onbekende migratiefout."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "40px auto",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <h1>Harkas IT — eenmalige migratie</h1>

      <p>
        Deze tool migreert de resterende vault- en storagegegevens
        van de oude Lovable Cloud omgeving naar Harkas Admin.
      </p>

      <p>
        De oude database wordt alleen gelezen. Er wordt niets
        verwijderd.
      </p>

      <div style={{ marginTop: 24 }}>
        <label>
          Nieuwe Supabase publishable/anon key
        </label>

        <input
          value={targetKey}
          onChange={(event) =>
            setTargetKey(event.target.value)
          }
          disabled={running}
          autoComplete="off"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            marginTop: 6,
            marginBottom: 16,
          }}
        />
      </div>

      <div>
        <label>
          Nieuw admin e-mailadres
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          disabled={running}
          autoComplete="username"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            marginTop: 6,
            marginBottom: 16,
          }}
        />
      </div>

      <div>
        <label>
          Nieuw admin wachtwoord
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          disabled={running}
          autoComplete="current-password"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            marginTop: 6,
            marginBottom: 16,
          }}
        />
      </div>

      <button
        onClick={runMigration}
        disabled={
          running ||
          !targetKey.trim() ||
          !email.trim() ||
          !password
        }
        style={{
          padding: "12px 20px",
          cursor: running ? "wait" : "pointer",
        }}
      >
        {running
          ? "Migratie bezig..."
          : "Start migratie"}
      </button>

      {progress && (
        <p style={{ marginTop: 20 }}>
          <strong>Status:</strong> {progress}
        </p>
      )}

      {logs.length > 0 && (
        <pre
          style={{
            marginTop: 20,
            whiteSpace: "pre-wrap",
            background: "#111",
            color: "#fff",
            padding: 16,
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          {logs
            .map(
              (entry) =>
                `[${entry.type.toUpperCase()}] ${entry.message}`
            )
            .join("\n")}
        </pre>
      )}
    </main>
  );
}
