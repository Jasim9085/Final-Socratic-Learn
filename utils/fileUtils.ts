
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result is in the format "data:mime/type;base64,THE_BASE64_STRING".
      // The Gemini API requires just the Base64 part.
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      if (!base64String) {
          reject(new Error("Could not extract Base64 string from file."));
          return;
      }
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => reject(error);
    });
};
