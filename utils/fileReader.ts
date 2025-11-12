
declare const pdfjsLib: any;

export const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (file.type === 'application/pdf') {
                const typedarray = new Uint8Array(reader.result as ArrayBuffer);
                pdfjsLib.getDocument(typedarray).promise.then((pdf: any) => {
                    let text = '';
                    const pages = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                        pages.push(i);
                    }
                    return Promise.all(pages.map(pageNum => {
                        return pdf.getPage(pageNum).then((page: any) => {
                            return page.getTextContent().then((textContent: any) => {
                                return textContent.items.map((item: any) => item.str).join(' ');
                            });
                        });
                    })).then(pagesText => {
                        resolve(pagesText.join('\n\n'));
                    });
                }).catch(reject);
            } else {
                resolve(reader.result as string);
            }
        };
        reader.onerror = reject;

        if (file.type === 'application/pdf') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
};
