/**
 * @typedef {{id: string, content: string}} Card
 * @typedef {{id: string, column: number}[]} Mapping
 */

window.addEventListener("load", () => {
    kanbanContainer = document.getElementById("kanban-container");

    const defaultColumns = [
        "abc",
        "def",
        "ghi",
    ];
    const defaultCards = [
        { id: "1", content: "abc1" },
        { id: "2", content: "abc2" },
        { id: "3", content: "def" },
        { id: "4", content: "def" },
        { id: "5", content: "def" },
        { id: "6", content: "def" },
        { id: "7", content: "def" },
        { id: "8", content: "def" },
        { id: "9", content: "def" },
        { id: "10", content: "def" },
        { id: "11", content: "def" },
        { id: "12", content: "def" },
        { id: "13", content: "def" },
        { id: "14", content: "def" },
        { id: "15", content: "def" },
        { id: "16", content: "def" },
        { id: "17", content: "def" },
        { id: "18", content: "def" },
        { id: "19", content: "def" },
        { id: "20", content: "def" },
        { id: "21", content: "def" },
        { id: "22", content: "def" },
        { id: "23", content: "def" },
        { id: "24", content: "def" },
        { id: "25", content: "def" },
        { id: "26", content: "def" },
        { id: "27", content: "def" },
    ];
    const defaultMapping = [
        { id: "1", column: 0 },
        { id: "2", column: 0 },
        { id: "3", column: 1 }
    ];

    const columns = JSON.parse(localStorage.getItem("kanban-columns")) ??
    defaultColumns;
    const cards = JSON.parse(localStorage.getItem("kanban-cards")) ??
    defaultCards;
    const mapping = JSON.parse(localStorage.getItem("kanban-mapping")) ??
    defaultMapping;

    const kanbanBoard = new KanbanBoard(kanbanContainer, columns, cards, mapping);

    saveBoard(kanbanBoard);

    kanbanBoard.addListenerAppendEmptyColumnListener(() => { console.log("AppendEmptyColumn"); saveBoard(kanbanBoard) });
    kanbanBoard.addListenerRemoveEmptyColumnListener(() => { console.log("RemoveEmptyColumn"); saveBoard(kanbanBoard) });
    kanbanBoard.addListenerRenameColumnToListener(() => { console.log("RenameColumnTo"); saveBoard(kanbanBoard) });
    kanbanBoard.addListenerMoveCardToColumnListener(() => { console.log("MoveCardToColumn"); saveBoard(kanbanBoard) });
});

function saveBoard(kanbanBoard) {
    localStorage.setItem("kanban-columns", JSON.stringify(kanbanBoard.exportColumns()));
    localStorage.setItem("kanban-cards", JSON.stringify(kanbanBoard.exportCards()));
    localStorage.setItem("kanban-mapping", JSON.stringify(kanbanBoard.exportMapping()));
}

class KanbanBoard {
    /**
     * @param {HTMLElement} renderIntoElement
     * @param {string[]} initialColumns
     * @param {Card[]} initialCards
     * @param {Mapping} initialMapping
     */
    constructor(renderIntoElement, initialColumns, initialCards, initialMapping) {
        this.container = renderIntoElement;
        this.container.classList.add("kanban-board");

        this.appendColumnButton = document.createElement("button");
        this.appendColumnButton.classList.add("kanban-append-column");
        this.appendColumnButton.addEventListener("click", () => {
            this.onAppendEmptyColumn("New Column");
        });
        this.appendColumnButton.innerText = "Add Column";

        this.container.appendChild(this.appendColumnButton);
        /**
         * @type {KanbanColumn[]}
         */
        this.columns = [];
        /**
         * @type {KanbanCard[]}
         */
        this.cards = [];
        /**
         * @type {Mapping}
         */
        this.mapping = [];//structuredClone(initialMapping).toSorted((m1, m2) => m1.column - m2.column);

        /**
         * @type {KanbanCard|null}
         */
        this.dragCard = null;
        /**
         * @type {KanbanColumn|null}
         */
        this.dropColumn = null;
        this.dragCardRowIndex = -1;
        this.dragCardHeight = -1;

        /**
         * @type {((initialName: string) => void)[]}
         */
        this.appendEmptyColumnListener = [];
        /**
         * @type {((columnIndex: number) => void)[]}
         */
        this.removeEmptyColumnListener = [];
        /**
         * @type {((columnIndex: number, newName: string) => void)[]}
         */
        this.renameColumnToListener = [];
        /**
         * @type {((id: string, columnIndex: number, rowIndex: number) => void)[]}
         */
        this.moveCardToColumnListener = [];

        for (const columnName of initialColumns) {
            this.onAppendEmptyColumn(columnName);
        }

        const remainingCards = structuredClone(initialCards);

        for (const map of initialMapping) {
            const cardIndex = remainingCards.findIndex((c) => c.id === map.id);
            const [card] = remainingCards.splice(cardIndex, 1);
            this.appendNewCardToColumn(card, map.column);
        }
        for (const card of remainingCards) {
            this.appendNewCardToColumn(card, 0);
        }
    }

    /**
     * @param {(initialName: string) => void} listener
     */
    addListenerAppendEmptyColumnListener(listener) {
        this.appendEmptyColumnListener.push(listener);
    }

    /**
     * @param {(columnIndex: number) => void} listener
     */
    addListenerRemoveEmptyColumnListener(listener) {
        this.removeEmptyColumnListener.push(listener);
    }

    /**
     * @param {(columnIndex: number, newName: string) => void} listener
     */
    addListenerRenameColumnToListener(listener) {
        this.renameColumnToListener.push(listener);
    }

    /**
     * @param {(id: string, columnIndex: number, rowIndex: number) => void} listener
     */
    addListenerMoveCardToColumnListener(listener) {
        this.moveCardToColumnListener.push(listener);
    }

    /**
     * @param {string} initialName
     */
    appendEmptyColumn(initialName) {
        const column = new KanbanColumn(this, initialName);
        this.container.insertBefore(column.container, this.appendColumnButton);
        this.columns.push(column);
    }

    /**
     * @param {number} columnIndex
     */
    removeEmptyColumn(columnIndex) {
        this.columns[columnIndex].removeEmptyColumn();
        this.columns.splice(columnIndex, 1);

        for (let i = 0; i < this.mapping.length; i++) {
            if (this.mapping[i].column < columnIndex) {
                continue;
            }

            this.mapping[i].column--;
        }
    }

    /**
     * @param {number} columnIndex
     * @param {string} newName
     */
    renameColumnTo(columnIndex, newName) {
        this.columns[columnIndex].renameColumnTo(newName);
    }

    /**
     * @param {Card} newCard
     * @param {number} columnIndex
     */
    appendNewCardToColumn(newCard, columnIndex) {
        const card = new KanbanCard(this, newCard);
        this.cards.push(card);
        this.mapping.push({id: newCard.id, column: columnIndex});
        const rowIndex = this.columns[columnIndex].getDOMChildren().length;
        this.moveCardToColumn(card.id, columnIndex, rowIndex);
    }

    /**
     * @param {string} cardId
     * @param {number} newColumnIndex
     * @param {number} rowIndex
     */
    moveCardToColumn(cardId, newColumnIndex, rowIndex) {
        const card = this.cards.find((c) => c.id === cardId);
        const column = this.columns[newColumnIndex];
        column.moveCardToColumn(card, rowIndex);

        const currentMappingIndex = this.mapping.findIndex((m) => m.id === cardId);
        const [currentMap] = this.mapping.splice(currentMappingIndex, 1);
        currentMap.column = newColumnIndex;

        // reorder mapping
        let index = -1;
        for (let i = 0; i < this.mapping.length; i++) {
            if (this.mapping[i].column >= newColumnIndex) {
                index = i;
                break;
            }
        }

        if (index === -1) {
            this.mapping.push(currentMap);
        } else {
            index += rowIndex;

            this.mapping.splice(index, 0, currentMap);
        }
    }

    /**
     * @param {string} initialName
     */
    onAppendEmptyColumn(initialName) {
        this.appendEmptyColumn(initialName);

        for (const listener of this.appendEmptyColumnListener) {
            listener(initialName);
        }
    }

    /**
     * @param {KanbanColumn} column
     */
    onRemoveEmptyColumn(column) {
        const columnIndex = this.columns.findIndex((c) => c === column);
        this.removeEmptyColumn(columnIndex);

        for (const listener of this.removeEmptyColumnListener) {
            listener(columnIndex);
        }
    }

    /**
     * @param {KanbanColumn} column
     * @param {string} newName
     */
    onRenameColumnTo(column, newName) {
        const columnIndex = this.columns.findIndex((c) => c === column);

        for (const listener of this.renameColumnToListener) {
            listener(columnIndex, newName);
        }
    }

    /**
     * @param {KanbanCard} card
     */
    onDragCardStart(card) {
        const columnIndex = this.mapping.find((m) => m.id === card.id).column;
        this.dragCard = card;
        this.dragCardHeight = this.dragCard.getCardHeight();

        this.dropColumn = this.columns[columnIndex];

        const children = this.dropColumn.getDOMChildren();
        for (let i = 0; i < children.length; i++) {
            if (children[i] === this.dragCard.container) {
                this.dragCardRowIndex = i;
                break;
            }
        }

        setTimeout(() => {
            this.dragCard.removeFromDOM();
            this.dropColumn.setPlaceholderHeight(this.dragCardHeight);
            this.dropColumn.setPlaceholderIndex(this.dragCardRowIndex);
            this.dropColumn.addDragOver();
        });
    }

    /**
     * @param {KanbanColumn} column
     * @param {number} cursorY
     */
    onDragOverColumn(column, cursorY) {
        if(this.dragCard === null) {
            // user is not drag-ing cards
            return;
        }

        if (this.dropColumn !== column) {
            this.dropColumn.removeDragOver();
            this.dropColumn.resetPlaceholderHeight();
            this.dropColumn.resetPlaceholderIndex();
            this.dropColumn = column;
            this.dropColumn.addDragOver();
            this.dropColumn.setPlaceholderHeight(this.dragCardHeight);
        }

        const children = this.dropColumn.getDOMChildren();
        let index = children.length;
        for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect();
            if (rect.y + rect.height / 2 > cursorY) {
                index = i;
                break;
            }
        }
        this.dragCardRowIndex = index;
        this.dropColumn.setPlaceholderIndex(index);
    }

    onDragCardEnd() {
        this.dropColumn.removeDragOver();

        const columnIndex = this.columns.findIndex((c) => c === this.dropColumn);
        this.moveCardToColumn(this.dragCard.id, columnIndex, this.dragCardRowIndex);

        for (const listener of this.moveCardToColumnListener) {
            listener(this.dragCard.id, columnIndex, this.dragCardRowIndex);
        }

        this.dragCard = null;
        this.dropColumn = null;
        this.dragCardRowIndex = -1;
        this.dragCardHeight = -1;
    }

    /**
     * @returns {string[]}
     */
    exportColumns() {
        return this.columns.map((c) => c.getName());
    }

    /**
     * @returns {Card[]}
     */
    exportCards() {
        return this.cards.map((c) => c.getCard());
    }

    /**
     * @returns {Mapping}
     */
    exportMapping() {
        return structuredClone(this.mapping);
    }
}

class KanbanColumn {
    /**
     * @param {KanbanBoard} board
     * @param {string} initialName
     */
    constructor(board, initialName) {
        this.board = board;

        this.container = document.createElement("div");
        this.container.classList.add("kanban-column");

        this.header = document.createElement("header");

        this.body = document.createElement("section");
        this.body.addEventListener("dragover", (e) => {
            this.board.onDragOverColumn(this, e.clientY);
        });

        this.removeButton = document.createElement("button");
        this.removeButton.innerText = "Remove Column";
        this.removeButton.addEventListener("click", () => {
            this.board.onRemoveEmptyColumn(this);
        })

        this.title = document.createElement("input");
        this.title.setAttribute("type", "text");
        this.title.value = initialName;
        this.title.addEventListener("input", () => {
            this.board.onRenameColumnTo(this, this.title.value);
        })

        this.header.append(this.title);

        this.container.append(this.header, this.body, this.removeButton);
    }

    /**
     * @returns {string}
     */
    getName() {
        return this.title.value;
    }

    /**
     * @param {KanbanCard} card
     * @param {number} rowIndex
     */
    moveCardToColumn(card, rowIndex) {
        this.body.insertBefore(card.container, this.body.children[rowIndex]);
    }

    /**
     * @param {string} newName
     */
    renameColumnTo(newName) {
        this.title.value = newName;
    }

    /**
     * @param {KanbanCard} card
     */
    appendNewCardToColumn(card) {
        this.body.append(card.container);
    }

    removeEmptyColumn() {
        this.container.remove();
    }

    removeDragOver() {
        this.body.classList.remove("drag-over");
    }

    addDragOver() {
        this.body.classList.add("drag-over");
    }

    /**
     * @returns {HTMLCollection}
     */
    getDOMChildren() {
        return this.body.children;
    }

    resetPlaceholderHeight() {
        this.body.style.setProperty("--placeholder-height", "");
    }

    resetPlaceholderIndex() {
        this.body.style.setProperty("--placeholder-index", "");
    }

    /**
     * @param {number} height
     */
    setPlaceholderHeight(height) {
        this.body.style.setProperty("--placeholder-height", `${height}px`);
    }

    /**
     * @param {number} index
     */
    setPlaceholderIndex(index) {
        this.body.style.setProperty("--placeholder-index", `${index + 1}`);
    }
}

class KanbanCard {
    /**
     * @param {KanbanBoard} board
     * @param {{id: string, content: string}} initialName
     */
    constructor(board, card) {
        this.board = board;
        this.id = card.id;
        this.content = card.content;
        this.container = document.createElement("div");
        this.container.classList.add("kanban-card");
        this.container.innerText = card.content;
        this.container.setAttribute("draggable", "true");

        this.container.addEventListener("dragstart", (e) => {
            this.board.onDragCardStart(this);
        });
        this.container.addEventListener("dragend", (e) => {
            this.board.onDragCardEnd();
        });
    }

    /**
     * @returns {Card}
     */
    getCard() {
        return { id: this.id, content: this.content };
    }

    /**
     * @returns {number}
     */
    getCardHeight() {
        const rect = this.container.getBoundingClientRect();
        return rect.height;
    }

    removeFromDOM() {
        this.container.remove();
    }
}
