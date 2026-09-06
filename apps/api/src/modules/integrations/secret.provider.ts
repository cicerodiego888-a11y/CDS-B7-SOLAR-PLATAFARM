export class EnvSecretProvider {
  read(name: string | undefined | null): string | undefined {
    if (!name) return undefined;
    const value = process.env[name];
    return value && value.trim() ? value : undefined;
  }

  has(name: string | undefined | null) {
    return Boolean(this.read(name));
  }
}
