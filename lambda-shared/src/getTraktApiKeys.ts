import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const getSecretString = async ({
  secretName,
  client,
}: {
  secretName: string;
  client: SecretsManagerClient;
}) => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  return data.SecretString || "";
};

export const getTraktApiKeys = async ({
  traktSecretName,
  tmdbSecretName,
  client,
}: {
  traktSecretName: string;
  tmdbSecretName: string;
  client: SecretsManagerClient;
}) => {
  if (!traktSecretName || !tmdbSecretName) {
    throw new Error("SECRET_NAME environment variable is not set");
  }

  const [traktApiKey, tmdbApiKey] = await Promise.all([
    getSecretString({ client, secretName: traktSecretName }),
    getSecretString({ client, secretName: tmdbSecretName }),
  ]);

  if (!traktApiKey || !tmdbApiKey) {
    throw new Error("api key is undefined");
  }

  return {
    traktApiKey,
    tmdbApiKey,
  };
};
