# Troubleshooting Guide

## Проблемы с загрузкой чанков (ChunkLoadError)

Если вы видите ошибку `ChunkLoadError: Loading chunk app/layout failed`, выполните следующие шаги:

### 1. Очистка кэша

```bash
# Очистить кэш Next.js
rm -rf .next

# Очистить node_modules и переустановить зависимости (если проблема сохраняется)
rm -rf node_modules package-lock.json
npm install
```

### 2. Проверка портов

```bash
# Убить процессы на портах 3000-3003
npm run kill-ports

# Или вручную
lsof -ti:3000,3001,3002,3003 | xargs kill -9
```

### 3. Перезапуск сервера разработки

```bash
# Остановить текущий процесс (Ctrl+C)
# Затем запустить заново
npm run dev
```

### 4. Проверка конфигурации

Убедитесь, что:
- ✅ `.env.local` файл существует и содержит все необходимые переменные
- ✅ `JWT_SECRET` установлен и имеет минимум 32 символа
- ✅ `DATABASE_URL` правильно настроен
- ✅ Нет конфликтов версий зависимостей

### 5. Проверка браузера

- Очистите кэш браузера (Ctrl+Shift+Delete)
- Откройте в режиме инкогнито
- Проверьте консоль браузера на наличие ошибок

### 6. Проверка логов

```bash
# Проверить логи сервера
npm run dev 2>&1 | tee dev.log
```

## Частые проблемы

### Проблема: "Module not found"

**Решение:**
```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Проблема: "Port already in use"

**Решение:**
```bash
npm run kill-ports
# Или
lsof -ti:3000 | xargs kill -9
```

### Проблема: "Database connection error"

**Решение:**
1. Проверьте, что PostgreSQL запущен
2. Проверьте `DATABASE_URL` в `.env.local`
3. Проверьте подключение:
   ```bash
   psql -U postgres -h localhost -d anyswap -c "SELECT version();"
   ```

### Проблема: "JWT_SECRET is not set"

**Решение:**
1. Сгенерируйте секретный ключ:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Добавьте в `.env.local`:
   ```
   JWT_SECRET=your-generated-secret-here
   ```

## Если ничего не помогает

1. Полная очистка:
   ```bash
   rm -rf .next node_modules package-lock.json
   npm install
   npm run dev
   ```

2. Проверка версий Node.js:
   ```bash
   node --version  # Должно быть >= 18.0.0
   npm --version
   ```

3. Обновление зависимостей:
   ```bash
   npm update
   ```

4. Проверка на конфликты зависимостей:
   ```bash
   npm audit
   npm audit fix
   ```

