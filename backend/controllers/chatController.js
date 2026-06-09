stream.on("data", (chunk) => {
  const lines = chunk.toString().split("\n").filter((l) => l.trim());

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const jsonStr = line.replace("data: ", "").trim();

      if (jsonStr === "[DONE]") {
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const token = parsed.choices?.[0]?.delta?.content || "";
        if (token) {
          fullReply += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      } catch (e) {}
    }
  }
});

// ← ADD THIS
stream.on("end", () => {
  if (fullReply) {
    Conversation.create({
      userId,
      userMessage: message,
      botReply: fullReply,
    });
  }
  if (!res.writableEnded) {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});