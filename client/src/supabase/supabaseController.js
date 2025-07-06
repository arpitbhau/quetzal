// radhe radhe

import supabase from "./supabaseConfig.js"

export async function getColumnValues(tableName, columnName) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
  
    if (error) return false
  
    // Extract only the column values from the rows
    return data.map(row => row[columnName])
}

export async function getCellValue(tableName, targetColumn, referenceColumn, referenceValue) {
    const { data, error } = await supabase
      .from(tableName)
      .select(targetColumn)
      .eq(referenceColumn, referenceValue)
      .single()
  
    if (error) {
        return error;
    }

    return data[targetColumn]
}

export async function checkValueExists(tableName, columnName, valueToCheck) {
    
    // usage: if (await fn(args) {})
    
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .eq(columnName, valueToCheck)
      .limit(1) // Only need to check one match
  
    if (error) return false
  
    return data.length > 0
}

export async function updateCellValue(tableName, targetColumn, referenceColumn, referenceValue, newValue) {
    const { data, error } = await supabase
      .from(tableName)
      .update({ [targetColumn]: newValue })
      .eq(referenceColumn, referenceValue)
      .select() // Optional: return updated row(s)
  
    if (error) return false;
  
    return !!data


}

export async function insertRow(tableName, roomId, connectedUsers) {
    const { data, error } = await supabase
      .from(tableName)
      .insert([
        {
          roomId: roomId,
          connectedUsers: connectedUsers
          // No need to set timestamp; it will use default now()
        }
      ])
      .select() // Optional: get inserted row(s)
  
    if (error) return false
  
    return !!data[0] // Return the inserted row
}

export async function countRows(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true }) // Only get count, not data

  if (error) return false

  return count
}

export async function deleteRow(tableName, referenceColumn, referenceValue) {
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq(referenceColumn, referenceValue)

  if (error) {
    return false
  }

  return !!data
}

export async function getFilteredRow(table, referenceColumn, referenceValue) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(referenceColumn, referenceValue)
    .single()

  if (error) return false

  // Destructure to remove 'id' and 'created_at'
  const { id, created_at, ...filteredRow } = data
  return filteredRow
}

export async function getFirstDataCell() {
    try {
        const { data, error } = await supabase
            .from('quetzal')
            .select('*')
            .limit(10);
        
        if (error) {
            return null;
        }
        
        if (!data || data.length === 0) {
            return [];
        }
        
        // Try to find a row with refRow='ref' first
        const refRow = data.find(row => row.refRow === 'ref');
        if (refRow) {
            return refRow.data || [];
        }
        
        // If no refRow='ref', use the first row
        const firstRow = data[0];
        return firstRow.data || [];
        
    } catch (err) {
        return null;
    }
}

export async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('quetzal')
            .select('*')
            .limit(1);
        
        if (error) {
            return false;
        }
        
        return true;
    } catch (err) {
        return false;
    }
}

export async function inspectQuetzalTable() {
    try {
        const { data, error } = await supabase
            .from('quetzal')
            .select('*');
        
        if (error) {
            return null;
        }
        
        return data;
    } catch (err) {
        return null;
    }
}

export async function listTables() {
    try {
        const { data, error } = await supabase
            .rpc('get_tables');
        
        if (error) {
            return null;
        }
        
        return data;
    } catch (err) {
        return null;
    }
}

export async function updatePapersData(newPapersData) {
    try {
        const { data: tableData, error: inspectError } = await supabase
            .from('quetzal')
            .select('*');
        
        if (inspectError) {
            throw inspectError;
        }
        
        const papersArray = newPapersData;
        
        let updateResult;
        
        if (tableData.some(row => row.refRow === 'ref')) {
            updateResult = await supabase
                .from('quetzal')
                .update({ data: papersArray })
                .eq('refRow', 'ref')
                .select();
        } 
        else if (tableData.length > 0) {
            const firstRow = tableData[0];
            updateResult = await supabase
                .from('quetzal')
                .update({ data: papersArray })
                .eq('id', firstRow.id)
                .select();
        } 
        else {
            updateResult = await supabase
                .from('quetzal')
                .insert([{ refRow: 'ref', data: papersArray }])
                .select();
        }
        
        const { data, error } = updateResult;
        
        if (error) {
            throw error;
        }
        
        return true;
    } catch (err) {
        throw err;
    }
}