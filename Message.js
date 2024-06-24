function PadNumberToWidthTwo(number) {
    const s = number.toString();
    if (s.length < 2) return '0' + s;
    else return s;
}

export default class Message {
    /** @type {Date} */
    #Time
    /** @type {String} */
    User
    /** @type {String} */
    Language
    /** @type {String} */
    Content
    /** @type {String | undefined} */
    Translation

    /**
     * Creates a message from information given.
     * @param {{Time: Date | undefined;User: string;Language: string;Content: string;Translation: string | undefined;}} MessageInfo Message Information.
     */
    constructor(MessageInfo = { Time, User, Language, Content, Translation}) {
        this.#Time = MessageInfo.Time ?? new Date();
        this.User = MessageInfo.User
        this.Language = MessageInfo.Language
        this.Content = MessageInfo.Content
        this.Translation = MessageInfo.Translation;
    }

    /**
     * Makes HTML of this message for the web client.
     * @returns {HTMLTableRowElement}
     */
    GetHTML() {
        const root = document.createElement('tr');
        
        [this.GetTimeInReadableFormat(), this.User, this.Language].forEach(v => {
            const data = document.createElement("td");
            data.innerText = v;
            root.appendChild(data);
        })

        const Contents = document.createElement("td");
        Contents.innerText = this.Content;
        if (this.Translation) {
            const tsElement = document.createElement("p");
            tsElement.innerText = this.Translation;
            Contents.appendChild(tsElement);
        }
        root.appendChild(Contents);

        return root;
    }

    GetTimeInReadableFormat() {
        let hours = PadNumberToWidthTwo(this.#Time.getHours());
        let minutes = PadNumberToWidthTwo(this.#Time.getMinutes());
        return `[${hours}:${minutes}]`;
    }
}