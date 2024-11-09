let dragElement = null;
let dropElement = null;
let dragElementHeight = 0;
let dragElementIndex = -1;

let columnIdCounter;

const defaultState = {
    columns: [{ id: 0, name: "Todo" }, { id: 1, name: "Abc" }],
    cards: []
};

let state;

window.onload = () => {
    state = JSON.parse(localStorage.getItem("state")) ?? defaultState;

    const cards = [
        { id: "A0", content: "Content 0" },
        { id: "A1", content: "Content 1" },
        { id: "A2", content: "Content 2" },
        { id: "A3", content: "Content 3" },
        { id: "A4", content: "Content 4" },
        { id: "A5", content: "Content 5" },
        { id: "A6", content: "Content 6" },
        { id: "A7", content: "Content 7" },
        { id: "A8", content: "Content 8" },
        { id: "A9", content: "Content 9" },
        { id: "A10", content: "Content 10" },
        { id: "A11", content: "Content 11" },
    ];

    const mainElement = document.querySelector("main");
    const addButtonElement = mainElement.querySelector("button");

    columnIdCounter = state.columns.reduce((maxId, c) => Math.max(c.id, maxId), 0);

    // MARK: add new ids
    const oldIds = new Set(state.cards.map((c) => c.id));
    for (const card of cards) {
        if (oldIds.has(card.id)) {
            continue;
        }

        state.cards.push({
            id: card.id,
            column: 0
        })
    }
    localStorage.setItem("state", JSON.stringify(state));

    // MARK: create columns
    for (let i = 0; i < state.columns.length; i++) {
        const column = state.columns[i];

        const ids = new Set(state.cards.filter((c) => c.column === i).map((c) => c.id));

        const columnCards = cards.filter((card) => ids.has(card.id));

        mainElement.insertBefore(
            createColumn(column, columnCards),
            addButtonElement
        );
    }

    addButtonElement.addEventListener("click", () => {
        columnIdCounter++;
        const columnDescription = { id: columnIdCounter, name: "new column" };
        mainElement.insertBefore(
            createColumn(columnDescription, []),
            addButtonElement
        );

        state.columns.push(columnDescription);
        localStorage.setItem("state", JSON.stringify(state));
    });
}

window.addEventListener("dragover", (e) => {
    // prevent drag cancel animation (sadly only cancels inside browser window)
    e.preventDefault();
});

function createColumn(columnDescription, columnCards) {
    const columnElement = document.createElement("section");
    const columnHeader = document.createElement("input");
    const columnBody = document.createElement("ol");
    const columnFooter = document.createElement("div");
    const columnDeleteButton = document.createElement("button");

    columnHeader.setAttribute("type", "text");
    columnHeader.setAttribute("value", columnDescription.name);
    columnHeader.addEventListener("input", () => {
        // MARK: update column name
        // NOTE: (`state` must contain a reference to `columnDescription`)
        columnDescription.name = columnHeader.value;
        localStorage.setItem("state", JSON.stringify(state));
    })
    columnDeleteButton.innerText = "Delete Column"

    columnDeleteButton.addEventListener("click", () => {
        columnElement.remove();

        const index = state.columns.findIndex((c) => c.id === columnDescription.id)
        state.columns.splice(index, 1);
        localStorage.setItem("state", JSON.stringify(state));
    });

    columnBody.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (dropElement !== columnBody) {
            dropElement.classList.remove("dragover")
            dropElement?.style?.setProperty("--drag-placeholder-height", "");
            dropElement?.style?.setProperty("--drag-placeholder-index", "");
            dropElement = columnBody;
        }

        let index = -1;
        let encounteredSelf = false;
        for (let i = 0; i < dropElement.children.length; i++) {
            const child = dropElement.children[i];

            if (child === dragElement) {
                encounteredSelf = true;
                continue;
            }

            const rect = child.getBoundingClientRect();

            if (rect.y + rect.height / 2 > e.clientY) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            dragElementIndex = index
        } else {
            dragElementIndex = dropElement.children.length;
        }

        if (encounteredSelf) {
            // encountering the hidden node shifts ordering
            dragElementIndex -= 1;
        }

        dropElement.classList.add("dragover")
        dropElement.style.setProperty("--drag-placeholder-height", `${dragElementHeight}px`);
        dropElement.style.setProperty("--drag-placeholder-index", `${dragElementIndex + 1}`);
        e.dataTransfer.dropEffect = "move";
    });

    columnElement.append(columnHeader, columnBody, columnFooter);
    for (const card of columnCards) {
        columnBody.appendChild(createCard(card));
    }
    columnFooter.appendChild(columnDeleteButton)

    return columnElement;
}

function createCard(card) {
    const cardElement = document.createElement("li");
    cardElement.innerText = card.content;
    cardElement.setAttribute("draggable", "true");

    cardElement.addEventListener("dragstart", (e) => {
        dragElement = cardElement;
        dropElement = cardElement.parentElement;

        dragElementHeight = dragElement.getBoundingClientRect().height;
        dragElementIndex = Array.from(dropElement.children).indexOf(dragElement);

        setTimeout(() => {
            if (dropElement.children.length === 1) {
                dropElement.classList.add("pseudo-empty");
            }

            // hide element during drag
            dragElement.style.display = "none";
            dropElement.classList.add("dragover")
            dropElement.style.setProperty("--drag-placeholder-height", `${dragElementHeight}px`);
            dropElement.style.setProperty("--drag-placeholder-index", `${dragElementIndex + 1}`);
        });
    });

    cardElement.addEventListener("dragend", (e) => {
        e.preventDefault();
        dragElement.style.display = "";

        dragElement.parentElement.classList.remove("pseudo-empty");

        const previousElement = dropElement.children[dragElementIndex];
        if (previousElement) {
            let encounteredSelf = false;
            let element = previousElement;
            while (element !== null) {
                if (element === dragElement) {
                    encounteredSelf = true;
                    break;
                }
                element = element.previousElementSibling;
            }
            if (encounteredSelf) {
                dropElement.insertBefore(dragElement, previousElement.nextElementSibling);
            } else {
                dropElement.insertBefore(dragElement, previousElement);
            }
        } else {
            dropElement.appendChild(dragElement);
        }

        dropElement.classList.remove("dragover")
        dropElement.style.setProperty("--drag-placeholder-height", "");
        dropElement.style.setProperty("--drag-placeholder-index", "");

        dragElement = null;
        dropElement = null;
    });

    return cardElement;
}
