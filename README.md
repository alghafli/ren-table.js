:Date: 2024-12-06

:Version: 0.0.0

:Authors:

    * Mohammad Alghafli <thebsom@gmail.com>

RenTable, a table web component which renders data based on their type.

example:

<script src="src/ren-table-min.js" type="text/javascript"></script>
<table is="ren-table">
    <thead>
        <th is="ren-th" type="text" name="title">Column 1</th>
        <th is="ren-th" type="progress" name="completed">Column 2</th>
        <th is="ren-th" type="check" name="done">Column 3</th>
        <th is="ren-th" type="img" name="icon">Column 4</th>
    </thead>
    <tbody>
        <tr>
            <td is="ren-td" value="text 1">
                Content will be rendered based on value attribute.
                Any content in here will be replaced.
            </td>
            <td is="ren-td" value="30">
                Cell type is taken from the corresponding ren-th type attribute.
                A progress column will display percentage.
                The max is 100. This will be 30%.
                You can change the max with the max attribute for the ten-td or
                for the corresponding ren-th.
            </td>
            <td is="ren-td" value="1">
                A check type displays an X mark if the value is empty text or
                not defined.
                It displays a check mark if the value is not an empty text.
            </td>
            <td is="ren-td" value="/my-image.jpeg">
                An img type expects an image url. ren-table will create an <img>
                element in the cell.
            </td>
        </tr>
    </tbody>
</table>

<script>
    let t = document.querySelector("table[is=ren-table]");
    
    //remove all rows and create new rows from data
    //expects an array of rows
    t.from(
        [
            //row can be an array
            ["new text", 50, false, "/new-image.png"],
            //or object. data will be taken based on the name attribute of each
            //ren-th.
            {
                title: "more text",
                completed: 100,
                done: true,
                icon: "/another-image.jpeg"
            }
        ]
    );
    
    //or you can set rows from src attribute.
    t.setAttribute("src", "data.json");     //or t.src = "data.json";
    
    //you can convert array of arrays.
    //values will be exported to suitable type. progress will be converted to
    //Number (value / max). check will be converted to boolean.
    let data = t.to_array();
</script>

